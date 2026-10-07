import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { migrate } from 'drizzle-orm/node-postgres/migrator'

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:integration-only@127.0.0.1:55432/tganalyzer_test'
process.env.REDIS_URL = 'redis://127.0.0.1:56379/0'
process.env.COOKIE_SECURE = 'false'
process.env.CORS_ORIGIN = 'http://localhost:3000'
await import('../src/test-env')

const { db, pool, schema } = await import('../src/db')
const { redis } = await import('../src/services/redis.service')
const { parseDialogsQueue, cleanupQueue } = await import('../src/queues/parse.queue')
const sessions = await import('../src/services/session.service')
const { buildServer } = await import('../src/server')
const { config, cookieName } = await import('../src/config')
const { signToken } = await import('../src/services/token.service')
const { authenticateToken } = await import('../src/services/auth-session.service')
const { consumeWsTicket } = await import('../src/services/ws-ticket.service')

let app: Awaited<ReturnType<typeof buildServer>>

before(async () => {
  await migrate(db, { migrationsFolder: './src/db/migrations' })
  await migrate(db, { migrationsFolder: './src/db/migrations' })
  await pool.query('TRUNCATE users CASCADE')
  await redis.flushdb()
  app = await buildServer()
})

after(async () => {
  await app?.close()
  await Promise.all([parseDialogsQueue.close(), cleanupQueue.close()])
  await redis.quit()
  await pool.end()
})

async function createUser() {
  const id = randomUUID()
  await pool.query(
    'INSERT INTO users(id, tg_user_id, timezone) VALUES ($1, $2, $3)',
    [id, Math.floor(Math.random() * 1e12), 'UTC'],
  )
  return id
}

async function createAuth(userId: string) {
  const session = await sessions.createRefreshSession(userId)
  const claims = { sub: userId, familyId: session.familyId }
  return {
    access: signToken('access', claims),
    cookie: `${cookieName}=${signToken('refresh', { ...claims, sessionId: session.tokenId })}`,
  }
}

function bearer(access: string) {
  return { authorization: `Bearer ${access}` }
}

test('HTTP auth accepts only a live access token and keeps users isolated', async () => {
  const first = await createUser()
  const second = await createUser()
  const auth = await createAuth(first)
  const legacyWs = jwt.sign(
    { sub: first, familyId: randomUUID(), kind: 'ws', version: 2 },
    config.JWT_SECRET,
    { algorithm: 'HS256', issuer: 'tg-analyzer', expiresIn: '1m' },
  )
  const expired = jwt.sign(
    { sub: first, familyId: randomUUID(), kind: 'access', version: 2 },
    config.JWT_SECRET,
    { algorithm: 'HS256', issuer: 'tg-analyzer', expiresIn: -1 },
  )

  assert.equal((await app.inject({ url: '/api/stats/global', headers: bearer(legacyWs) })).statusCode, 401)
  assert.equal((await app.inject({ url: '/api/stats/global', headers: bearer(expired) })).statusCode, 401)
  assert.equal((await app.inject({ url: '/api/stats/global', headers: bearer(auth.access) })).statusCode, 200)

  const update = await app.inject({
    method: 'PATCH',
    url: '/api/auth/profile',
    headers: { ...bearer(auth.access), origin: 'http://localhost:3000' },
    payload: { timezone: 'Europe/Moscow' },
  })
  assert.equal(update.statusCode, 200)
  const rows = await pool.query('SELECT id, timezone FROM users WHERE id = ANY($1::uuid[]) ORDER BY id', [[first, second]])
  assert.equal(rows.rows.find(row => row.id === first)?.timezone, 'Europe/Moscow')
  assert.equal(rows.rows.find(row => row.id === second)?.timezone, 'UTC')
})

test('refresh races share one successor and logout revokes the whole family', async () => {
  const userId = await createUser()
  const auth = await createAuth(userId)
  const request = () => app.inject({
    method: 'POST',
    url: '/api/auth/refresh',
    headers: { cookie: auth.cookie, origin: 'http://localhost:3000' },
    remoteAddress: '127.0.0.21',
  })
  const [first, second] = await Promise.all([request(), request()])
  assert.equal(first.statusCode, 200)
  assert.equal(second.statusCode, 200)

  const firstCookie = first.cookies.find(cookie => cookie.name === cookieName)
  const secondCookie = second.cookies.find(cookie => cookie.name === cookieName)
  assert.ok(firstCookie && secondCookie)
  const firstClaims = jwt.verify(firstCookie.value, config.JWT_REFRESH_SECRET) as { sessionId: string }
  const secondClaims = jwt.verify(secondCookie.value, config.JWT_REFRESH_SECRET) as { sessionId: string }
  assert.equal(firstClaims.sessionId, secondClaims.sessionId)

  const access = first.json<{ accessToken: string }>().accessToken
  const logout = await app.inject({
    method: 'POST',
    url: '/api/auth/logout',
    headers: { cookie: `${cookieName}=${firstCookie.value}`, origin: 'http://localhost:3000' },
    remoteAddress: '127.0.0.22',
  })
  assert.equal(logout.statusCode, 200)
  assert.equal((await app.inject({ url: '/api/stats/global', headers: bearer(access) })).statusCode, 401)
  assert.equal((await app.inject({
    method: 'POST',
    url: '/api/auth/refresh',
    headers: { cookie: `${cookieName}=${firstCookie.value}`, origin: 'http://localhost:3000' },
    remoteAddress: '127.0.0.23',
  })).statusCode, 401)
})

test('cookie operations enforce Origin and auth limits are shared through Redis', async () => {
  const userId = await createUser()
  const auth = await createAuth(userId)
  const rejectedOrigin = await app.inject({
    method: 'POST',
    url: '/api/auth/logout',
    headers: { cookie: auth.cookie, origin: 'https://evil.example' },
    remoteAddress: '127.0.0.31',
  })
  assert.equal(rejectedOrigin.statusCode, 403)
  assert.equal(rejectedOrigin.json<{ code: string }>().code, 'ORIGIN_FORBIDDEN')
  assert.equal((await app.inject({
    method: 'POST',
    url: '/api/auth/logout',
    headers: { cookie: auth.cookie },
    remoteAddress: '127.0.0.32',
  })).statusCode, 403)

  const statuses: number[] = []
  for (let index = 0; index <= config.AUTH_RATE_LIMIT_MAX; index += 1) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { origin: 'http://localhost:3000' },
      remoteAddress: '127.0.0.33',
    })
    statuses.push(response.statusCode)
    if (index === config.AUTH_RATE_LIMIT_MAX) {
      const body = response.json<{ code: string; requestId: string }>()
      assert.equal(body.code, 'RATE_LIMITED')
      assert.ok(body.requestId)
    }
  }
  assert.deepEqual(statuses.slice(0, -1), Array(config.AUTH_RATE_LIMIT_MAX).fill(401))
  assert.equal(statuses.at(-1), 429)
})

test('websocket tickets are origin-protected, family-bound and single-use', async () => {
  const userId = await createUser()
  const auth = await createAuth(userId)
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/ws-ticket',
    headers: { ...bearer(auth.access), origin: 'http://localhost:3000' },
    remoteAddress: '127.0.0.41',
  })
  assert.equal(response.statusCode, 200)
  const { ticket } = response.json<{ ticket: string }>()
  assert.deepEqual(await consumeWsTicket(ticket, redis), {
    sub: userId,
    familyId: (jwt.decode(auth.access) as { familyId: string }).familyId,
  })
  assert.equal(await consumeWsTicket(ticket, redis), null)
})

test('temporary auth data is encrypted and account deletion revokes access and clears cache', async () => {
  const context = { phone: '+19995550123', phoneCodeHash: 'private-hash', createdAt: new Date().toISOString() }
  const tempToken = await sessions.savePendingPasswordContext(context)
  const raw = await redis.get(`auth:temp:${tempToken}`)
  assert.ok(raw && !raw.includes(context.phone) && !raw.includes(context.phoneCodeHash))
  assert.deepEqual(await sessions.getPendingPasswordContext(tempToken), context)

  const userId = await createUser()
  const auth = await createAuth(userId)
  await redis.set(`parse:dialogs:${userId}`, 'private-cache')
  const response = await app.inject({
    method: 'DELETE',
    url: '/api/auth/account',
    headers: { ...bearer(auth.access), origin: 'http://localhost:3000' },
    remoteAddress: '127.0.0.51',
  })
  assert.equal(response.statusCode, 200)
  assert.equal((await db.query.users.findFirst({ where: (users, { eq }) => eq(users.id, userId) })), undefined)
  const remainingSessions = await pool.query(
    'SELECT count(*)::int AS count FROM refresh_sessions WHERE user_id = $1',
    [userId],
  )
  assert.equal(remainingSessions.rows[0]?.count, 0)
  assert.equal(await redis.get(`parse:dialogs:${userId}`), null)
  await assert.rejects(authenticateToken(auth.access, 'access'))
})

test('validation errors preserve message, code and requestId', async () => {
  const userId = await createUser()
  const auth = await createAuth(userId)
  const response = await app.inject({
    method: 'PATCH',
    url: '/api/auth/profile',
    headers: { ...bearer(auth.access), origin: 'http://localhost:3000' },
    payload: { timezone: '' },
  })
  assert.equal(response.statusCode, 400)
  const body = response.json<{ message: string; code: string; requestId: string }>()
  assert.equal(body.message, 'Request validation failed')
  assert.equal(body.code, 'INVALID_REQUEST')
  assert.ok(body.requestId)
})

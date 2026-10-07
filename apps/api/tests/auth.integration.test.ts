import test, { after, before, beforeEach } from 'node:test'
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

const { db, pool } = await import('../src/db')
const { redis } = await import('../src/services/redis.service')
const { parseDialogsQueue, cleanupQueue } = await import('../src/queues/parse.queue')
const sessions = await import('../src/services/session.service')
const { buildServer } = await import('../src/server')
const { config, cookieName } = await import('../src/config')
const { signToken } = await import('../src/services/token.service')
const { authenticateToken } = await import('../src/services/auth-session.service')
const { consumeWsTicket } = await import('../src/services/ws-ticket.service')
const stats = await import('../src/services/stats.service')
const { reconcileParseJobs } = await import('../src/services/job-reconciliation.service')

let app: Awaited<ReturnType<typeof buildServer>>

before(async () => {
  await migrate(db, { migrationsFolder: './src/db/migrations' })
  await migrate(db, { migrationsFolder: './src/db/migrations' })
  app = await buildServer()
})

beforeEach(async () => {
  await pool.query('TRUNCATE users CASCADE')
  await redis.flushdb()
})

after(async () => {
  await app?.close()
  await Promise.all([parseDialogsQueue.close(), cleanupQueue.close()])
  await redis.quit()
  await pool.end()
})

async function createUser() {
  const id = randomUUID()
  await pool.query('INSERT INTO users(id, tg_user_id, timezone) VALUES ($1, $2, $3)', [
    id,
    Math.floor(Math.random() * 1e12),
    'UTC',
  ])
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
  const legacyWs = jwt.sign({ sub: first, familyId: randomUUID(), kind: 'ws', version: 2 }, config.JWT_SECRET, {
    algorithm: 'HS256',
    issuer: 'tg-analyzer',
    expiresIn: '1m',
  })
  const expired = jwt.sign({ sub: first, familyId: randomUUID(), kind: 'access', version: 2 }, config.JWT_SECRET, {
    algorithm: 'HS256',
    issuer: 'tg-analyzer',
    expiresIn: -1,
  })

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
  const rows = await pool.query('SELECT id, timezone FROM users WHERE id = ANY($1::uuid[]) ORDER BY id', [
    [first, second],
  ])
  assert.equal(rows.rows.find((row) => row.id === first)?.timezone, 'Europe/Moscow')
  assert.equal(rows.rows.find((row) => row.id === second)?.timezone, 'UTC')
})

test('versioned API exposes an OpenAPI document and keeps legacy routes available', async () => {
  const userId = await createUser()
  const auth = await createAuth(userId)
  const headers = bearer(auth.access)

  assert.equal((await app.inject({ url: '/api/v1/stats/global', headers })).statusCode, 200)
  assert.equal((await app.inject({ url: '/api/stats/global', headers })).statusCode, 200)

  const openApi = await app.inject({ url: '/documentation/json' })
  assert.equal(openApi.statusCode, 200)
  const document = openApi.json<{
    paths: Record<string, { get?: { responses?: Record<string, unknown>; parameters?: unknown[] } }>
  }>()
  assert.ok(document.paths['/api/v1/stats/global']?.get?.responses?.['200'])
  assert.ok(document.paths['/api/v1/stats/chats']?.get?.parameters?.length)

  const missingChat = await app.inject({ url: '/api/v1/stats/chats/123', headers })
  assert.equal(missingChat.statusCode, 404)
  assert.deepEqual(Object.keys(missingChat.json()).sort(), ['code', 'message', 'requestId'])
})

test('versioned parse history returns an isolated page with a total count', async () => {
  const userId = await createUser()
  const otherUserId = await createUser()
  const auth = await createAuth(userId)
  const jobIds: string[] = []

  for (let index = 0; index < 3; index += 1) {
    const jobId = await sessions.createParseJob({ userId, chatId: 900 + index, chatName: `Page ${index}` })
    await sessions.updateParseJob(jobId, { status: 'completed', completedAt: new Date() })
    jobIds.push(jobId)
  }
  const otherJobId = await sessions.createParseJob({ userId: otherUserId, chatId: 999, chatName: 'Other user' })
  await sessions.updateParseJob(otherJobId, { status: 'completed', completedAt: new Date() })

  const firstPage = await app.inject({
    url: '/api/v1/parse/history?page=1&limit=2',
    headers: bearer(auth.access),
  })
  const secondPage = await app.inject({
    url: '/api/v1/parse/history?page=2&limit=2',
    headers: bearer(auth.access),
  })
  const first = firstPage.json<{ items: Array<{ jobId: string }>; total: number; page: number; limit: number }>()
  const second = secondPage.json<{ items: Array<{ jobId: string }>; total: number; page: number; limit: number }>()

  assert.equal(firstPage.statusCode, 200)
  assert.equal(secondPage.statusCode, 200)
  assert.equal(first.total, 3)
  assert.equal(first.items.length, 2)
  assert.equal(second.items.length, 1)
  assert.equal(second.page, 2)
  assert.equal(new Set([...first.items, ...second.items].map((item) => item.jobId)).size, 3)
  assert.ok([...first.items, ...second.items].every((item) => jobIds.includes(item.jobId)))
})

test('refresh races share one successor and logout revokes the whole family', async () => {
  const userId = await createUser()
  const auth = await createAuth(userId)
  const request = () =>
    app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { cookie: auth.cookie, origin: 'http://localhost:3000' },
      remoteAddress: '127.0.0.21',
    })
  const [first, second] = await Promise.all([request(), request()])
  assert.equal(first.statusCode, 200)
  assert.equal(second.statusCode, 200)

  const firstCookie = first.cookies.find((cookie) => cookie.name === cookieName)
  const secondCookie = second.cookies.find((cookie) => cookie.name === cookieName)
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
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        headers: { cookie: `${cookieName}=${firstCookie.value}`, origin: 'http://localhost:3000' },
        remoteAddress: '127.0.0.23',
      })
    ).statusCode,
    401,
  )
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
  assert.equal(
    (
      await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: { cookie: auth.cookie },
        remoteAddress: '127.0.0.32',
      })
    ).statusCode,
    403,
  )

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
  assert.equal(await db.query.users.findFirst({ where: (users, { eq }) => eq(users.id, userId) }), undefined)
  const remainingSessions = await pool.query('SELECT count(*)::int AS count FROM refresh_sessions WHERE user_id = $1', [
    userId,
  ])
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

test('only one active parse job can be reserved for a user', async () => {
  const userId = await createUser()
  const reservations = await Promise.allSettled([
    sessions.createParseJob({ userId, chatId: 101, chatName: 'First' }),
    sessions.createParseJob({ userId, chatId: 202, chatName: 'Second' }),
  ])

  assert.equal(reservations.filter((result) => result.status === 'fulfilled').length, 1)
  assert.equal(reservations.filter((result) => result.status === 'rejected').length, 1)

  const jobs = await pool.query(
    `SELECT id, bull_job_id, chat_id, requested_chat_ids
       FROM parse_jobs
      WHERE user_id = $1 AND status IN ('pending', 'running')`,
    [userId],
  )
  assert.equal(jobs.rowCount, 1)
  assert.equal(jobs.rows[0]?.bull_job_id, jobs.rows[0]?.id)
  assert.deepEqual(jobs.rows[0]?.requested_chat_ids, [String(jobs.rows[0]?.chat_id)])
})

test('a forged Redis active marker cannot cancel another user job', async () => {
  const ownerId = await createUser()
  const attackerId = await createUser()
  const attackerAuth = await createAuth(attackerId)
  const jobId = await sessions.createParseJob({ userId: ownerId, chatId: 303, chatName: 'Owner chat' })
  await redis.set(`parse:active:${attackerId}`, jobId)

  const response = await app.inject({
    method: 'DELETE',
    url: '/api/parse/cancel',
    headers: { ...bearer(attackerAuth.access), origin: 'http://localhost:3000' },
  })

  assert.equal(response.statusCode, 404)
  const job = await sessions.findParseJobById(jobId)
  assert.equal(job?.status, 'pending')
  assert.equal(await redis.get(`parse:active:${attackerId}`), null)
})

function createStats(message: string, date: Date, outgoing = true) {
  const accumulator = stats.createChatAccumulator('UTC')
  stats.aggregateMessage({ message, date, outgoing }, accumulator)
  return accumulator
}

test('saving reports is idempotent and serializes aggregate updates per user', async () => {
  const userId = await createUser()
  const date = new Date('2026-09-10T12:00:00.000Z')

  await Promise.all([
    stats.saveAggregates({
      userId,
      chat: { id: 401, title: 'One', type: 'private' },
      stats: createStats('first', date),
    }),
    stats.saveAggregates({
      userId,
      chat: { id: 402, title: 'Two', type: 'private' },
      stats: createStats('second', date, false),
    }),
  ])
  await stats.saveAggregates({
    userId,
    chat: { id: 401, title: 'One updated', type: 'private' },
    stats: createStats('replacement', date),
  })

  const global = await pool.query(
    'SELECT total_chats, total_messages, total_sent, total_received FROM global_stats WHERE user_id = $1',
    [userId],
  )
  assert.deepEqual(global.rows[0], {
    total_chats: 2,
    total_messages: '2',
    total_sent: '1',
    total_received: '1',
  })
  const daily = await pool.query('SELECT sent, received FROM daily_activity WHERE user_id = $1 AND date = $2', [
    userId,
    '2026-09-10',
  ])
  assert.deepEqual(daily.rows, [{ sent: 1, received: 1 }])
})

test('a failed aggregate recomputation rolls back the chat report', async () => {
  const userId = await createUser()
  await pool.query(`
    CREATE OR REPLACE FUNCTION integration_fail_global_stats() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION 'forced aggregate failure';
    END;
    $$ LANGUAGE plpgsql;
    CREATE TRIGGER integration_fail_global_stats
      BEFORE INSERT OR UPDATE ON global_stats
      FOR EACH ROW EXECUTE FUNCTION integration_fail_global_stats();
  `)

  try {
    await assert.rejects(
      stats.saveAggregates({
        userId,
        chat: { id: 501, title: 'Rollback', type: 'private' },
        stats: createStats('must rollback', new Date('2026-09-11T12:00:00.000Z')),
      }),
    )

    const chat = await pool.query('SELECT id FROM chat_stats WHERE user_id = $1 AND tg_chat_id = 501', [userId])
    assert.equal(chat.rowCount, 0)
    const daily = await pool.query('SELECT id FROM daily_activity WHERE user_id = $1', [userId])
    assert.equal(daily.rowCount, 0)
  } finally {
    await pool.query('DROP TRIGGER IF EXISTS integration_fail_global_stats ON global_stats')
    await pool.query('DROP FUNCTION IF EXISTS integration_fail_global_stats()')
  }
})

test('cancellation committed before persistence prevents report writes', async () => {
  const userId = await createUser()
  const jobId = await sessions.createParseJob({ userId, chatId: 601, chatName: 'Cancelled' })
  await sessions.updateParseJob(jobId, { status: 'running' })
  assert.equal(await sessions.cancelParseJob(userId, jobId), true)

  await assert.rejects(
    stats.saveAggregates({
      userId,
      jobId,
      chat: { id: 601, title: 'Cancelled', type: 'private' },
      stats: createStats('too late', new Date('2026-09-12T12:00:00.000Z')),
    }),
    /no longer active/,
  )

  const chat = await pool.query('SELECT id FROM chat_stats WHERE user_id = $1 AND tg_chat_id = 601', [userId])
  assert.equal(chat.rowCount, 0)
})

test('concurrent report save and deletion leave aggregates consistent', async () => {
  const userId = await createUser()
  const date = new Date('2026-09-13T12:00:00.000Z')
  await stats.saveAggregates({
    userId,
    chat: { id: 701, title: 'Old', type: 'private' },
    stats: createStats('old', date),
  })

  await Promise.all([
    stats.saveAggregates({
      userId,
      chat: { id: 702, title: 'New', type: 'private' },
      stats: createStats('new', date, false),
    }),
    stats.deleteChatReport(userId, '701'),
  ])

  const actual = await pool.query(
    'SELECT count(*)::int AS chats, coalesce(sum(total_messages), 0)::bigint AS messages FROM chat_stats WHERE user_id = $1',
    [userId],
  )
  const global = await pool.query('SELECT total_chats, total_messages FROM global_stats WHERE user_id = $1', [userId])
  assert.equal(global.rows[0]?.total_chats, actual.rows[0]?.chats)
  assert.equal(global.rows[0]?.total_messages, actual.rows[0]?.messages)
})

test('reconciliation restores a missing BullMQ job from persisted parameters', async () => {
  const userId = await createUser()
  const jobId = await sessions.createParseJob({
    userId,
    chatId: 801,
    chatName: 'Recover me',
    chatIds: ['801'],
  })

  assert.equal(await parseDialogsQueue.getJob(jobId), undefined)
  const result = await reconcileParseJobs()
  assert.equal(result.enqueued, 1)

  const queued = await parseDialogsQueue.getJob(jobId)
  assert.deepEqual(queued?.data, { userId, jobId, chatIds: ['801'] })
  const persisted = await sessions.findParseJobById(jobId)
  assert.ok(persisted?.enqueuedAt)
  await queued?.remove()
  await sessions.cancelParseJob(userId, jobId)
})

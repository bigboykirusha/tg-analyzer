import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { ORIGIN, REFRESH_COOKIE_NAME, app, login, nextIp, pool, useTestServer } from './helpers'

useTestServer()

const { signToken } = await import('../src/modules/auth/tokens')
const { issueWsTicket, consumeWsTicket } = await import('../src/modules/auth/ws-tickets')
const { getTelegramSession } = await import('../src/modules/account/telegram-sessions')

function refresh(cookie: string, ip = nextIp()) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/auth/refresh',
    headers: { cookie, origin: ORIGIN },
    remoteAddress: ip,
  })
}

test('health is public and unknown routes return the error contract', async () => {
  assert.equal((await app.inject({ url: '/health' })).statusCode, 200)
  const missing = await app.inject({ url: '/api/v1/nope' })
  assert.equal(missing.statusCode, 404)
  assert.equal(missing.json().code, 'NOT_FOUND')
  assert.ok(missing.headers['x-request-id'])
})

test('login maps Telegram failures to specific error codes', async () => {
  const phone = '+79990000002'
  const sent = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/send-code',
    payload: { phone },
    remoteAddress: nextIp(),
  })
  assert.equal(sent.statusCode, 200)
  const { phoneCodeHash } = sent.json()

  const wrongCode = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/verify-code',
    payload: { phone, code: '00000', phoneCodeHash },
    remoteAddress: nextIp(),
  })
  assert.equal(wrongCode.statusCode, 400)
  assert.equal(wrongCode.json().code, 'LOGIN_CODE_INVALID')

  const unknownHash = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/verify-code',
    payload: { phone, code: '12345', phoneCodeHash: 'missing' },
    remoteAddress: nextIp(),
  })
  assert.equal(unknownHash.json().code, 'LOGIN_SESSION_EXPIRED')

  const invalidPhone = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/send-code',
    payload: { phone: 'abc' },
    remoteAddress: nextIp(),
  })
  assert.equal(invalidPhone.json().code, 'INVALID_REQUEST')
})

test('two-step verification requires the password', async () => {
  const phone = '+79990000009'
  const { phoneCodeHash } = (
    await app.inject({ method: 'POST', url: '/api/v1/auth/send-code', payload: { phone }, remoteAddress: nextIp() })
  ).json()
  const verified = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/verify-code',
    payload: { phone, code: '12345', phoneCodeHash },
    remoteAddress: nextIp(),
  })
  const pending = verified.json()
  assert.equal(pending.passwordRequired, true)
  assert.equal(pending.passwordHint, 'secret')

  const wrong = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/verify-password',
    payload: { tempToken: pending.tempToken, password: 'nope' },
    remoteAddress: nextIp(),
  })
  assert.equal(wrong.json().code, 'LOGIN_PASSWORD_INVALID')

  const ok = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/verify-password',
    payload: { tempToken: pending.tempToken, password: 'secret' },
    remoteAddress: nextIp(),
  })
  assert.equal(ok.statusCode, 200)
  assert.ok(ok.json().accessToken)
  assert.equal(ok.json().user.telegramSessionActive, true)
})

test('login attempts are rate limited per client', async () => {
  const ip = nextIp()
  const statuses: number[] = []
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/send-code',
      payload: { phone: '+79990000003' },
      remoteAddress: ip,
    })
    statuses.push(response.statusCode)
    if (response.statusCode === 429) assert.equal(response.json().code, 'RATE_LIMITED')
  }
  assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429])
})

test('the guard accepts only live access tokens', async () => {
  const session = await login()
  const ok = await app.inject({ url: '/api/v1/reports', headers: session.headers })
  assert.equal(ok.statusCode, 200)

  const familyId = randomUUID()
  const expired = jwt.sign({ sub: session.userId, familyId, kind: 'access', version: 2 }, process.env.JWT_SECRET!, {
    algorithm: 'HS256',
    issuer: 'tg-analyzer',
    expiresIn: -10,
  })
  const refreshAsAccess = signToken('refresh', { sub: session.userId, familyId, sessionId: randomUUID() })
  const revokedFamily = signToken('access', { sub: session.userId, familyId })

  for (const token of [undefined, 'garbage', expired, refreshAsAccess, revokedFamily]) {
    const response = await app.inject({
      url: '/api/v1/reports',
      headers: token ? { authorization: `Bearer ${token}` } : {},
    })
    assert.equal(response.statusCode, 401, String(token))
    assert.equal(response.json().code, 'AUTH_UNAUTHORIZED')
  }
})

test('refresh rotates the token, tolerates races and revokes the family on replay', async () => {
  const session = await login()

  const [first, second] = await Promise.all([refresh(session.cookie), refresh(session.cookie)])
  assert.equal(first.statusCode, 200)
  assert.equal(second.statusCode, 200)
  const rotated = first.cookies.find((cookie) => cookie.name === REFRESH_COOKIE_NAME)
  assert.ok(rotated)

  // Outside the grace period, reusing the old token is treated as theft.
  await pool.query(
    `UPDATE refresh_sessions SET grace_until = now() - interval '1 second' WHERE grace_until IS NOT NULL`,
  )
  const replay = await refresh(session.cookie)
  assert.equal(replay.statusCode, 401)
  assert.equal(replay.json().code, 'AUTH_REFRESH_REPLAYED')

  const afterReplay = await refresh(`${REFRESH_COOKIE_NAME}=${rotated.value}`)
  assert.equal(afterReplay.statusCode, 401)
  const access = await app.inject({ url: '/api/v1/reports', headers: session.headers })
  assert.equal(access.statusCode, 401)
})

test('cookie operations require an allowed origin', async () => {
  const session = await login()
  const foreign = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/refresh',
    headers: { cookie: session.cookie, origin: 'https://evil.example' },
    remoteAddress: nextIp(),
  })
  assert.equal(foreign.statusCode, 403)
  assert.equal(foreign.json().code, 'ORIGIN_FORBIDDEN')

  const noOrigin = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/refresh',
    headers: { cookie: session.cookie },
    remoteAddress: nextIp(),
  })
  assert.equal(noOrigin.statusCode, 403)
})

test('logout on the last device revokes the session and the Telegram authorization', async () => {
  const first = await login()
  const second = await login()
  assert.equal(first.userId, second.userId)

  const logoutFirst = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/logout',
    headers: { cookie: first.cookie, origin: ORIGIN },
    remoteAddress: nextIp(),
  })
  assert.equal(logoutFirst.statusCode, 200)
  assert.equal((await refresh(first.cookie)).statusCode, 401)
  // Still signed in on the second device: the Telegram session stays.
  assert.ok(await getTelegramSession(first.userId))

  await app.inject({
    method: 'POST',
    url: '/api/v1/auth/logout',
    headers: { cookie: second.cookie, origin: ORIGIN },
    remoteAddress: nextIp(),
  })
  assert.equal(await getTelegramSession(first.userId), null)
})

test('websocket tickets are single use, origin bound and deliver progress', async () => {
  const session = await login()
  const ticket = (
    await app.inject({ method: 'POST', url: '/api/v1/auth/ws-ticket', headers: { ...session.headers, origin: ORIGIN } })
  ).json().ticket as string
  assert.match(ticket, /^[A-Za-z0-9_-]{43}$/)

  await assert.rejects(
    app.injectWS(`/ws/parse-progress?ticket=${ticket}`, { headers: { origin: 'https://evil.example' } }),
  )

  const fresh = await issueWsTicket({ sub: session.userId, familyId: randomUUID() })
  await assert.rejects(app.injectWS(`/ws/parse-progress?ticket=${fresh}`, { headers: { origin: ORIGIN } }))

  const valid = (
    await app.inject({ method: 'POST', url: '/api/v1/auth/ws-ticket', headers: { ...session.headers, origin: ORIGIN } })
  ).json().ticket as string
  const socket = await app.injectWS(`/ws/parse-progress?ticket=${valid}`, { headers: { origin: ORIGIN } })
  assert.equal(await consumeWsTicket(valid), null, 'ticket is consumed')

  const received = new Promise<string>((resolve) => socket.once('message', (data: Buffer) => resolve(String(data))))
  const { publishProgress, idleProgress } = await import('../src/modules/parse/state')
  await publishProgress(session.userId, {
    ...idleProgress(),
    jobId: randomUUID(),
    status: 'running',
    phase: 'scanning',
  })
  assert.equal(JSON.parse(await received).phase, 'scanning')
  socket.terminate()
})

test('timezone updates are validated', async () => {
  const session = await login()
  const ok = await app.inject({
    method: 'PATCH',
    url: '/api/v1/auth/profile',
    headers: { ...session.headers, origin: ORIGIN },
    payload: { timezone: 'Europe/Moscow' },
  })
  assert.equal(ok.json().user.timezone, 'Europe/Moscow')

  const invalid = await app.inject({
    method: 'PATCH',
    url: '/api/v1/auth/profile',
    headers: { ...session.headers, origin: ORIGIN },
    payload: { timezone: 'Mars/Olympus' },
  })
  assert.equal(invalid.statusCode, 400)
})

test('deleting the account removes every row of the user', async () => {
  const session = await login()
  const response = await app.inject({
    method: 'DELETE',
    url: '/api/v1/auth/account',
    headers: { ...session.headers, origin: ORIGIN },
  })
  assert.equal(response.statusCode, 200)
  const remaining = await pool.query('SELECT count(*)::int AS n FROM users')
  assert.equal(remaining.rows[0].n, 0)
  assert.equal((await refresh(session.cookie)).statusCode, 401)
})

test('send-code reports where the code went and resend switches channel on the same attempt', async () => {
  const phone = '+79990000077'
  const sent = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/send-code',
    payload: { phone },
    remoteAddress: nextIp(),
  })
  assert.equal(sent.statusCode, 200)
  const first = sent.json<{ phoneCodeHash: string; delivery: { type: string; nextType: string | null } }>()
  assert.equal(first.delivery.type, 'app')
  assert.equal(first.delivery.nextType, 'sms')

  const resent = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/resend-code',
    payload: { phone, phoneCodeHash: first.phoneCodeHash },
    remoteAddress: nextIp(),
  })
  assert.equal(resent.statusCode, 200)
  const second = resent.json<{ phoneCodeHash: string; delivery: { type: string } }>()
  assert.equal(second.delivery.type, 'sms')

  // The resent code still signs in.
  const verified = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/verify-code',
    payload: { phone, code: '12345', phoneCodeHash: second.phoneCodeHash },
    remoteAddress: nextIp(),
  })
  assert.equal(verified.statusCode, 200)

  // Resending for an unknown attempt asks to start over.
  const unknown = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/resend-code',
    payload: { phone, phoneCodeHash: 'missing' },
    remoteAddress: nextIp(),
  })
  assert.equal(unknown.statusCode, 401)
  assert.equal(unknown.json<{ code: string }>().code, 'LOGIN_SESSION_EXPIRED')
})

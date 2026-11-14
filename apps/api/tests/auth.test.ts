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

test('refresh rotates the token and tolerates races', async () => {
  const session = await login()

  const [first, second] = await Promise.all([refresh(session.cookie), refresh(session.cookie)])
  assert.equal(first.statusCode, 200)
  assert.equal(second.statusCode, 200)
  const rotated = first.cookies.find((cookie) => cookie.name === REFRESH_COOKIE_NAME)
  assert.ok(rotated)
  const next = await refresh(`${REFRESH_COOKIE_NAME}=${rotated.value}`)
  assert.equal(next.statusCode, 200)
})

test('a copy of the cookie (Safari and the installed app) branches instead of signing both out', async () => {
  const session = await login()
  // Safari goes on rotating; the installed app still holds the cookie iOS copied at «На экран Домой».
  const safari = await refresh(session.cookie)
  const safariCookie = safari.cookies.find((cookie) => cookie.name === REFRESH_COOKIE_NAME)
  assert.ok(safariCookie)
  const safariNext = await refresh(`${REFRESH_COOKIE_NAME}=${safariCookie.value}`)
  assert.equal(safariNext.statusCode, 200)
  const safariLatest = safariNext.cookies.find((cookie) => cookie.name === REFRESH_COOKIE_NAME)
  assert.ok(safariLatest)
  await pool.query(
    `UPDATE refresh_sessions SET grace_until = now() - interval '1 second' WHERE grace_until IS NOT NULL`,
  )

  const app2 = await refresh(session.cookie)
  assert.equal(app2.statusCode, 200)
  const appCookie = app2.cookies.find((cookie) => cookie.name === REFRESH_COOKIE_NAME)
  assert.ok(appCookie)
  assert.notEqual(appCookie.value, safariLatest.value)

  // Both go on; «Выйти» in one ends the login in both.
  const safariAfter = await refresh(`${REFRESH_COOKIE_NAME}=${safariLatest.value}`)
  assert.equal(safariAfter.statusCode, 200)
  const safariNow = safariAfter.cookies.find((cookie) => cookie.name === REFRESH_COOKIE_NAME)
  assert.ok(safariNow)
  const appAfter = await refresh(`${REFRESH_COOKIE_NAME}=${appCookie.value}`)
  assert.equal(appAfter.statusCode, 200)
  const appLatest = appAfter.cookies.find((cookie) => cookie.name === REFRESH_COOKIE_NAME)
  assert.ok(appLatest)
  const logout = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/logout',
    headers: { cookie: `${REFRESH_COOKIE_NAME}=${appLatest.value}`, origin: ORIGIN },
    remoteAddress: nextIp(),
  })
  assert.equal(logout.statusCode, 200)
  const safariGone = await refresh(`${REFRESH_COOKIE_NAME}=${safariNow.value}`)
  assert.equal(safariGone.statusCode, 401)
})

test('a refresh whose answer was lost keeps the person signed in', async () => {
  const session = await login()
  // The server rotated the token, but the phone never received the new cookie.
  const lost = await refresh(session.cookie)
  assert.equal(lost.statusCode, 200)
  await pool.query(
    `UPDATE refresh_sessions SET grace_until = now() - interval '1 second' WHERE grace_until IS NOT NULL`,
  )
  // Much later the old cookie comes back: the never-used successor is handed out again.
  const again = await refresh(session.cookie)
  assert.equal(again.statusCode, 200)
  const cookie = again.cookies.find((item) => item.name === REFRESH_COOKIE_NAME)
  assert.ok(cookie)
  const next = await refresh(`${REFRESH_COOKIE_NAME}=${cookie.value}`)
  assert.equal(next.statusCode, 200)
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

test('profile rejects empty updates and settings it does not know', async () => {
  const session = await login()
  const headers = { ...session.headers, origin: ORIGIN }
  const empty = await app.inject({ method: 'PATCH', url: '/api/v1/auth/profile', headers, payload: {} })
  assert.equal(empty.statusCode, 400)
  // «Sign out after every analysis» is gone: the field is not a setting any more.
  const removed = await app.inject({
    method: 'PATCH',
    url: '/api/v1/auth/profile',
    headers,
    payload: { disconnectAfterAnalysis: true },
  })
  assert.equal(removed.statusCode, 400)
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

test('a bot button signs in someone who has signed in before, once, while it is fresh', async () => {
  const { config } = await import('../src/config')
  const { createHash, createHmac } = await import('node:crypto')
  const previous = config.TELEGRAM_BOT_TOKEN
  ;(config as { TELEGRAM_BOT_TOKEN?: string }).TELEGRAM_BOT_TOKEN = '123456:test-bot-token'
  try {
    const session = await login('+79990000077')
    const { rows } = await pool.query<{ tg_user_id: string }>('select tg_user_id from users where id = $1', [
      session.userId,
    ])
    const sign = (fields: Record<string, string>, token = config.TELEGRAM_BOT_TOKEN!) => {
      const check = Object.keys(fields)
        .sort()
        .map((key) => `${key}=${fields[key]}`)
        .join('\n')
      const secret = createHash('sha256').update(token).digest()
      return { ...fields, hash: createHmac('sha256', secret).update(check).digest('hex') }
    }
    const press = (fields: Record<string, string>) =>
      app.inject({
        method: 'POST',
        url: '/api/v1/auth/telegram-login',
        payload: { fields },
        headers: { origin: ORIGIN },
        remoteAddress: nextIp(),
      })
    const now = String(Math.floor(Date.now() / 1000))
    const fields = sign({ id: rows[0]!.tg_user_id, first_name: 'Demo', auth_date: now })

    const first = await press(fields)
    assert.equal(first.statusCode, 200)
    assert.equal(first.json().user.id, session.userId)
    assert.ok(first.cookies.find((cookie) => cookie.name === REFRESH_COOKIE_NAME))

    // The same link again (history, a screenshot): refused.
    assert.equal((await press(fields)).json().code, 'AUTH_TELEGRAM_LOGIN_INVALID')
    // Signed with another bot's token, changed after signing, too old, or someone who never signed in: refused.
    const forged = sign({ id: rows[0]!.tg_user_id, auth_date: now }, '999:other-bot')
    assert.equal((await press(forged)).statusCode, 401)
    const changed = { ...sign({ id: rows[0]!.tg_user_id, auth_date: now, first_name: 'A' }), first_name: 'B' }
    assert.equal((await press(changed)).statusCode, 401)
    const old = sign({ id: rows[0]!.tg_user_id, auth_date: String(Number(now) - 3600) })
    assert.equal((await press(old)).statusCode, 401)
    const stranger = sign({ id: '987654321012', auth_date: now })
    assert.equal((await press(stranger)).statusCode, 401)
  } finally {
    ;(config as { TELEGRAM_BOT_TOKEN?: string }).TELEGRAM_BOT_TOKEN = previous
  }
})

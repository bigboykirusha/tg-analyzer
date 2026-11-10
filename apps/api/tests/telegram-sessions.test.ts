import test from 'node:test'
import assert from 'node:assert/strict'
import type { TelegramSessionsResponse } from '@tg-analyzer/shared'
import { ORIGIN, app, login, useTestServer } from './helpers'
import type { FakeTelegramGateway } from '../src/telegram/fake-gateway'

useTestServer()

const { telegram } = await import('../src/telegram')
const fake = telegram as FakeTelegramGateway

test('devices: Telegram sessions are listed without IPs, the current one is marked, others can be ended', async () => {
  const session = await login('+79990000071')
  const list = await app.inject({ url: '/api/v1/telegram/sessions', headers: session.headers })
  assert.equal(list.statusCode, 200, list.body)
  const { sessions } = list.json<TelegramSessionsResponse>()
  assert.ok(sessions.length >= 3)
  assert.equal(sessions.filter((item) => item.current).length, 1)
  assert.ok(sessions.every((item) => !('ip' in item)))

  const other = sessions.find((item) => !item.current)!
  const ended = await app.inject({
    method: 'DELETE',
    url: `/api/v1/telegram/sessions/${other.hash}`,
    headers: { ...session.headers, origin: ORIGIN },
  })
  assert.equal(ended.statusCode, 200, ended.body)
  const after = await app.inject({ url: '/api/v1/telegram/sessions', headers: session.headers })
  assert.ok(!after.json<TelegramSessionsResponse>().sessions.some((item) => item.hash === other.hash))
})

test('devices: the current session and unknown hashes cannot be ended, a fresh login gets its own code', async () => {
  const session = await login('+79990000072')
  const listed = await app.inject({ url: '/api/v1/telegram/sessions', headers: session.headers })
  const { sessions } = listed.json<TelegramSessionsResponse>()
  const end = (hash: string) =>
    app.inject({
      method: 'DELETE',
      url: `/api/v1/telegram/sessions/${hash}`,
      headers: { ...session.headers, origin: ORIGIN },
    })

  const own = await end(sessions.find((item) => item.current)!.hash)
  assert.equal(own.statusCode, 400, own.body)
  assert.equal(own.json<{ code: string }>().code, 'TELEGRAM_SESSION_CURRENT')
  assert.equal((await end('424242')).statusCode, 404)

  fake.freshLogin = true
  try {
    const fresh = await end(sessions.find((item) => !item.current)!.hash)
    assert.equal(fresh.statusCode, 403)
    assert.equal(fresh.json<{ code: string }>().code, 'TELEGRAM_SESSION_TOO_FRESH')
  } finally {
    fake.freshLogin = false
  }
  assert.equal((await app.inject({ url: '/api/v1/telegram/sessions' })).statusCode, 401)
})

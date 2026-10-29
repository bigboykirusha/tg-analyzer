import test from 'node:test'
import assert from 'node:assert/strict'
import { ORIGIN, app, login, pool, processJob, useTestServer } from './helpers'

useTestServer()

const { handleBotUpdate } = await import('../src/modules/notify/bot')

/** Records Bot API calls instead of sending them. */
function captureBot() {
  const calls: { method: string; body: Record<string, unknown> }[] = []
  const original = globalThis.fetch
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    if (!url.startsWith('https://api.telegram.org/')) return original(input, init)
    calls.push({ method: url.split('/').pop()!, body: JSON.parse(String(init?.body ?? '{}')) })
    return new Response(JSON.stringify({ ok: true, result: {} }))
  }) as typeof fetch
  return { calls, restore: () => (globalThis.fetch = original) }
}

test('Start in the bot turns on «the report is ready», and the report then arrives there', async () => {
  const session = await login()
  const me = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: session.headers })
  const user = me.json<{ user: { tgUserId: string; botNotify: boolean; botUrl: string } }>().user
  assert.equal(user.botNotify, false)
  assert.equal(user.botUrl, 'https://t.me/tganalyzer_test_bot?start=notify')

  const bot = captureBot()
  try {
    const from = Number(user.tgUserId)
    await handleBotUpdate({
      update_id: 1,
      message: { chat: { id: from, type: 'private' }, from: { id: from }, text: '/start notify' },
    })
    const { rows } = await pool.query('SELECT bot_notify FROM users WHERE id = $1', [session.userId])
    assert.equal(rows[0].bot_notify, true)
    assert.equal(bot.calls.length, 1)

    const started = await app.inject({
      method: 'POST',
      url: '/api/v1/parse/start',
      headers: { ...session.headers, origin: ORIGIN },
      payload: { chatId: '1006' },
    })
    await processJob(session.userId, started.json<{ jobId: string }>().jobId)
    const ready = bot.calls.at(-1)!
    assert.equal(ready.method, 'sendMessage')
    assert.equal(ready.body.chat_id, from)
    assert.match(String(ready.body.text), /Катя/)

    // Turned off from the site.
    const off = await app.inject({
      method: 'PATCH',
      url: '/api/v1/auth/profile',
      headers: { ...session.headers, origin: ORIGIN },
      payload: { botNotify: false },
    })
    assert.equal(off.json<{ user: { botNotify: boolean } }>().user.botNotify, false)
  } finally {
    bot.restore()
  }
})

test('a stranger who presses Start is asked to sign in first', async () => {
  const bot = captureBot()
  try {
    await handleBotUpdate({
      update_id: 2,
      message: { chat: { id: 42, type: 'private' }, from: { id: 42 }, text: '/start' },
    })
    assert.match(String(bot.calls[0]?.body.text), /войдите/i)
  } finally {
    bot.restore()
  }
})

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

test('Start in the bot subscribes to its news only: a ready report goes by push, never to the bot', async () => {
  const { setPushSender } = await import('../src/modules/notify/push')
  const session = await login()
  const me = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: session.headers })
  const user = me.json<{ user: { tgUserId: string; botNotify: boolean; botUrl: string } }>().user
  assert.equal(user.botNotify, false)
  assert.equal(user.botUrl, 'https://t.me/tganalyzer_test_bot?start=news')

  const pushed: { endpoint: string; payload: Record<string, string> }[] = []
  setPushSender(async (subscription, payload) => {
    pushed.push({ endpoint: subscription.endpoint, payload: JSON.parse(payload) })
    return 201
  })
  const bot = captureBot()
  try {
    const from = Number(user.tgUserId)
    await handleBotUpdate({
      update_id: 1,
      message: { chat: { id: from, type: 'private' }, from: { id: from }, text: '/start news' },
    })
    const { rows } = await pool.query('SELECT stopped_at FROM bot_subscribers WHERE chat_id = $1', [from])
    assert.equal(rows[0].stopped_at, null)
    assert.equal(bot.calls.length, 1)
    // The welcome's button is a plain link: the bot signs no one in.
    const markup = JSON.stringify(bot.calls[0]!.body.reply_markup ?? {})
    assert.doesNotMatch(markup, /login_url/)
    const after = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: session.headers })
    assert.equal(after.json<{ user: { botNotify: boolean } }>().user.botNotify, true)

    const subscribed = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/push',
      headers: { ...session.headers, origin: ORIGIN },
      payload: {
        endpoint: 'https://push.example.com/send/abc',
        keys: { p256dh: 'B'.repeat(87), auth: 'a'.repeat(22) },
        locale: 'ru',
      },
    })
    assert.equal(subscribed.statusCode, 200)

    const started = await app.inject({
      method: 'POST',
      url: '/api/v1/parse/start',
      headers: { ...session.headers, origin: ORIGIN },
      payload: { chatId: '1006' },
    })
    await processJob(session.userId, started.json<{ jobId: string }>().jobId)
    assert.equal(bot.calls.length, 1, 'the bot said nothing about the report')
    const ready = pushed.at(-1)!
    assert.equal(ready.endpoint, 'https://push.example.com/send/abc')
    assert.equal(ready.payload.title, 'Отчёт готов')
    assert.match(ready.payload.body!, /Катя · [\d\s]+ сообщени/)
    assert.equal(ready.payload.url, '/chat/1006')

    // Turned off from the site: the bot's news, as /stop.
    const off = await app.inject({
      method: 'PATCH',
      url: '/api/v1/auth/profile',
      headers: { ...session.headers, origin: ORIGIN },
      payload: { botNotify: false },
    })
    assert.equal(off.json<{ user: { botNotify: boolean } }>().user.botNotify, false)
  } finally {
    bot.restore()
    setPushSender(null)
  }
})

test('a push service that forgot the browser removes its subscription; signing out of it removes it too', async () => {
  const { setPushSender } = await import('../src/modules/notify/push')
  const { notify } = await import('../src/modules/notify/notifications')
  const session = await login('+79990000302')
  const subscribe = (endpoint: string) =>
    app.inject({
      method: 'POST',
      url: '/api/v1/notifications/push',
      headers: { ...session.headers, origin: ORIGIN },
      payload: { endpoint, keys: { p256dh: 'B'.repeat(87), auth: 'a'.repeat(22) }, locale: 'en' },
    })
  await subscribe('https://push.example.com/send/gone')
  await subscribe('https://push.example.com/send/kept')
  const pushed: Record<string, string>[] = []
  setPushSender(async (subscription, payload) => {
    if (subscription.endpoint.endsWith('gone')) throw Object.assign(new Error('Gone'), { statusCode: 410 })
    pushed.push(JSON.parse(payload))
    return 201
  })
  try {
    await notify(session.userId, { chatId: '1011', title: 'Mila' }, { kind: 'quiz_answered', score: 3, total: 5 })
    assert.deepEqual(pushed, [
      { title: 'Quiz answered', body: 'Mila · 3 of 5', url: '/chat/1011?share', tag: 'quiz_answered:1011' },
    ])
    const count = async () =>
      (await pool.query('SELECT endpoint FROM push_subscriptions WHERE user_id = $1', [session.userId])).rows.map(
        (row) => row.endpoint,
      )
    assert.deepEqual(await count(), ['https://push.example.com/send/kept'])

    const removed = await app.inject({
      method: 'POST',
      url: '/api/v1/notifications/push/remove',
      headers: { ...session.headers, origin: ORIGIN },
      payload: { endpoint: 'https://push.example.com/send/kept' },
    })
    assert.equal(removed.statusCode, 200)
    assert.deepEqual(await count(), [])
    const key = await app.inject({ method: 'GET', url: '/api/v1/notifications/push', headers: session.headers })
    assert.match(key.json<{ publicKey: string }>().publicKey, /^B/)
  } finally {
    setPushSender(null)
  }
})

test('a stranger who presses Start is subscribed to the news too', async () => {
  const bot = captureBot()
  try {
    await handleBotUpdate({
      update_id: 2,
      message: { chat: { id: 42, type: 'private' }, from: { id: 42 }, text: '/start' },
    })
    assert.match(String(bot.calls[0]?.body.text), /новости/i)
    const { rows } = await pool.query('SELECT stopped_at FROM bot_subscribers WHERE chat_id = 42')
    assert.equal(rows.length, 1)
    await handleBotUpdate({
      update_id: 3,
      message: { chat: { id: 42, type: 'private' }, from: { id: 42 }, text: '/stop' },
    })
    const stopped = await pool.query('SELECT stopped_at FROM bot_subscribers WHERE chat_id = 42')
    assert.notEqual(stopped.rows[0].stopped_at, null)
  } finally {
    bot.restore()
  }
})

test('a message to the bot after «Сообщить о проблеме» reaches the developer', async () => {
  const { config } = await import('../src/config')
  const previous = { token: config.ALERT_TELEGRAM_BOT_TOKEN, chat: config.ALERT_TELEGRAM_CHAT_ID }
  config.ALERT_TELEGRAM_BOT_TOKEN = '654321:alerts-only-bot-token-abcdefghijkl'
  config.ALERT_TELEGRAM_CHAT_ID = '-100500'
  const session = await login('+79990000301')
  const me = await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: session.headers })
  const user = me.json<{ user: { tgUserId: string; feedbackUrl: string | null } }>().user
  assert.equal(user.feedbackUrl, 'https://t.me/tganalyzer_test_bot?start=feedback')
  const bot = captureBot()
  try {
    const from = Number(user.tgUserId)
    const chat = { id: from, type: 'private' }
    await handleBotUpdate({ update_id: 10, message: { chat, from: { id: from }, text: '/start feedback' } })
    await handleBotUpdate({ update_id: 11, message: { chat, from: { id: from }, text: 'Не открывается отчёт' } })
    const delivered = bot.calls.find((call) => call.body.chat_id === '-100500')
    assert.ok(delivered, 'the message went to the developer chat')
    assert.match(String(delivered.body.text), /Не открывается отчёт/)
    // The person is thanked; «Start» for feedback does not subscribe them to the news.
    assert.match(String(bot.calls.at(-1)!.body.text), /передано/)
    const { rows } = await pool.query('SELECT 1 FROM bot_subscribers WHERE chat_id = $1', [from])
    assert.equal(rows.length, 0)
  } finally {
    bot.restore()
    config.ALERT_TELEGRAM_BOT_TOKEN = previous.token
    config.ALERT_TELEGRAM_CHAT_ID = previous.chat
  }
})

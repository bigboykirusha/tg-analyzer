import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { ORIGIN, app, nextIp, useTestServer } from './helpers'

useTestServer()

const { config } = await import('../src/config')
const { recordError, sendAlert, startWorkerWatch } = await import('../src/modules/system/alerts')
const { CLIENT_ERROR_RATE_LIMIT_MAX, scrubClientText } = await import('../src/modules/system/client-errors')

const report = {
  kind: 'vue',
  route: '/chat/:id()',
  message: "Cannot read properties of undefined (reading 'x')",
  stack: 'TypeError: boom\n    at render (/_nuxt/entry.js:1:1)',
  build: 'abc123',
  ua: 'Mozilla/5.0 test',
}

function send(payload: unknown, ip = nextIp()) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/client-errors',
    headers: { origin: ORIGIN },
    payload: payload as object,
    remoteAddress: ip,
  })
}

test('a browser error report is accepted without a session', async () => {
  const response = await send(report)
  assert.equal(response.statusCode, 204)
})

test('a report may omit the optional fields', async () => {
  const response = await send({ kind: 'window', route: '/', message: 'oops' })
  assert.equal(response.statusCode, 204)
})

test('malformed reports are rejected', async () => {
  for (const bad of [
    {},
    { ...report, message: '' },
    { ...report, message: 'x'.repeat(301) },
    { ...report, stack: 'x'.repeat(2001) },
    { ...report, kind: 'other' },
    { ...report, route: undefined },
  ]) {
    const response = await send(bad)
    assert.equal(response.statusCode, 400, JSON.stringify(bad).slice(0, 80))
  }
})

test('an oversized body is refused before it is parsed', async () => {
  const response = await send({ ...report, stack: 'x'.repeat(20_000) })
  assert.equal(response.statusCode, 413)
})

test('one address can send only so many reports a minute', async () => {
  const ip = nextIp()
  for (let index = 0; index < CLIENT_ERROR_RATE_LIMIT_MAX; index += 1) {
    assert.equal((await send(report, ip)).statusCode, 204)
  }
  const limited = await send(report, ip)
  assert.equal(limited.statusCode, 429)
  assert.equal(limited.json<{ code: string }>().code, 'RATE_LIMITED')
  // Another address is not affected.
  assert.equal((await send(report)).statusCode, 204)
})

async function withWebhook(run: (received: { text: string }[]) => Promise<void>) {
  const received: { text: string }[] = []
  const server: Server = createServer((request, response) => {
    let body = ''
    request.on('data', (chunk) => (body += chunk))
    request.on('end', () => {
      received.push(JSON.parse(body))
      response.end('ok')
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const previous = { url: config.ALERT_WEBHOOK_URL, threshold: config.ALERT_ERROR_THRESHOLD }
  config.ALERT_WEBHOOK_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/hook`
  config.ALERT_ERROR_THRESHOLD = 3
  try {
    await run(received)
  } finally {
    config.ALERT_WEBHOOK_URL = previous.url
    config.ALERT_ERROR_THRESHOLD = previous.threshold
    await new Promise((resolve) => server.close(resolve))
  }
}

async function until(condition: () => boolean, ms = 3000) {
  const deadline = Date.now() + ms
  while (!condition() && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 25))
}

test('alerts stay silent without a destination', async () => {
  assert.equal(await sendAlert('silent', 'nobody listens'), false)
})

test('a burst of errors raises one alert, and a repeat of the same alert is throttled', async () => {
  await withWebhook(async (received) => {
    for (let index = 0; index < 8; index += 1) recordError('client')
    await until(() => received.length > 0)
    await new Promise((resolve) => setTimeout(resolve, 200))
    assert.equal(received.length, 1)
    assert.match(received[0]!.text, /Browser errors: 3 in/)

    assert.equal(await sendAlert('burst:client', 'again'), false)
    assert.equal(received.length, 1)
  })
})

test('a silent worker is reported once, and its return is announced', async () => {
  await withWebhook(async (received) => {
    let alive = false
    const stop = startWorkerWatch(async () => alive, 20)
    try {
      await until(() => received.length > 0)
      await new Promise((resolve) => setTimeout(resolve, 200))
      assert.equal(received.length, 1)
      assert.match(received[0]!.text, /worker has stopped answering/)

      alive = true
      await until(() => received.length > 1)
      assert.match(received[1]!.text, /processing jobs again/)
    } finally {
      stop()
    }
  })
})

test('a heartbeat check that cannot run (Redis down) raises an alert instead of passing as healthy', async () => {
  await withWebhook(async (received) => {
    const stop = startWorkerWatch(async () => {
      throw new Error('redis is down')
    }, 20)
    try {
      await until(() => received.length > 0)
      await new Promise((resolve) => setTimeout(resolve, 200))
      assert.equal(received.length, 1)
      assert.match(received[0]!.text, /cannot read the worker heartbeat/)
    } finally {
      stop()
    }
  })
})

test('the server cuts addresses, query strings, e-mails and phone numbers out of a client error', () => {
  const text = scrubClientText(
    'Failed at https://tg.example/chat/12?token=abc#x, mail me a.b@mail.com or +7 (916) 123-45-67, see http://[bad',
  )
  assert.doesNotMatch(text, /token|abc|mail\.com|916|123-45/)
  assert.match(text, /\/chat\/12/)
  assert.equal(scrubClientText('plain message'), 'plain message')
})

test('a fake-mode API says so on every answer, so local test sign-ins can refuse a live stack', async () => {
  assert.equal(config.TELEGRAM_MODE, 'fake')
  const health = await app.inject({ method: 'GET', url: '/health' })
  assert.equal(health.headers['x-telegram-mode'], 'fake')
  const unauthorised = await app.inject({ method: 'GET', url: '/api/v1/notifications/unread' })
  assert.equal(unauthorised.statusCode, 401)
  assert.equal(unauthorised.headers['x-telegram-mode'], 'fake')
})

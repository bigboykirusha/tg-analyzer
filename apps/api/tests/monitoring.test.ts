import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { ORIGIN, app, nextIp, useTestServer } from './helpers'

useTestServer()

const { config } = await import('../src/config')
const { recordError, sendAlert, startWorkerWatch } = await import('../src/modules/system/alerts')
const { CLIENT_ERROR_RATE_LIMIT_MAX } = await import('../src/modules/system/client-errors')

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

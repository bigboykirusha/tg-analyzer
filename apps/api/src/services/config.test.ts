import test from 'node:test'
import assert from 'node:assert/strict'
import { parseConfig } from '../config'

test('explicit false remains false and invalid boolean is rejected', () => {
  assert.equal(parseConfig({ ...process.env, COOKIE_SECURE: 'false' }).COOKIE_SECURE, false)
  assert.throws(() => parseConfig({ ...process.env, COOKIE_SECURE: 'maybe' }))
})

test('config rejects invalid ports, URLs, origins, cookie domains and unsafe production settings', () => {
  for (const overrides of [
    { API_PORT: '0' },
    { DATABASE_URL: 'not-a-url' },
    { REDIS_URL: 'https://localhost' },
    { CORS_ORIGIN: 'https://web.example/path' },
    { COOKIE_DOMAIN: 'https://example.com' },
    { NODE_ENV: 'production', COOKIE_SECURE: 'false' },
    { NODE_ENV: 'production', CORS_ORIGIN: '*' },
    { COOKIE_SECURE: 'false', COOKIE_SAME_SITE: 'none' },
  ])
    assert.throws(() => parseConfig({ ...process.env, ...overrides }))
})

test('invalid config does not disclose a rejected secret', () => {
  assert.throws(
    () => parseConfig({ ...process.env, JWT_SECRET: 'private' }),
    (error) => {
      assert.ok(error instanceof Error)
      assert.ok(!error.message.includes('private'))
      return true
    },
  )
})

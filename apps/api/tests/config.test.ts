import './setup'
import test from 'node:test'
import assert from 'node:assert/strict'

const { parseConfig } = await import('../src/config')

const base = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:pass@db:5432/app',
  REDIS_URL: 'redis://redis:6379',
  TELEGRAM_API_ID: '12345',
  TELEGRAM_API_HASH: 'f3a9c81d6b2e4705a1c9d8e7b6f5a4c3',
  SESSION_ENCRYPTION_KEY: '9f8e7d6c5b4a39281706f5e4d3c2b1a09f8e7d6c5b4a39281706f5e4d3c2b1a0',
  JWT_SECRET: 'Zq8vN3xLw2Kp7Rt5Ys1Bm6Hc4Fg9Dj0Ae',
  JWT_REFRESH_SECRET: 'Pk4Wn7Qx2Lv9Rs5Ty1Hb8Mc3Fg6Dj0Ze',
  CORS_ORIGIN: 'https://app.example.org',
}

test('a complete production configuration is accepted with secure defaults', () => {
  const config = parseConfig(base)
  assert.equal(config.COOKIE_SECURE, true)
  assert.equal(config.COOKIE_SAME_SITE, 'lax')
  assert.equal(config.API_PORT, 3001)
  assert.equal(parseConfig({ ...base, PORT: '10000' }).API_PORT, 10000)
})

test('unsafe production configurations are rejected', () => {
  for (const override of [
    { CORS_ORIGIN: '*' },
    { CORS_ORIGIN: 'http://app.example.org' },
    { COOKIE_SECURE: 'false' },
    { TELEGRAM_MODE: 'fake' },
    { JWT_REFRESH_SECRET: base.JWT_SECRET },
    { JWT_SECRET: 'change-me-change-me-change-me-change-me' },
    { TELEGRAM_API_HASH: undefined },
    { SESSION_ENCRYPTION_KEY: 'short' },
  ]) {
    assert.throws(() => parseConfig({ ...base, ...override }), /Invalid configuration/, JSON.stringify(override))
  }
})

test('fake Telegram mode works without API credentials outside production', () => {
  const config = parseConfig({
    ...base,
    NODE_ENV: 'development',
    TELEGRAM_MODE: 'fake',
    TELEGRAM_API_ID: undefined,
    TELEGRAM_API_HASH: undefined,
  })
  assert.equal(config.TELEGRAM_MODE, 'fake')
})

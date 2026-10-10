import test from 'node:test'
import assert from 'node:assert/strict'
import { apiSecurityHeaders } from './security-headers.service'

test('API replies carry a restrictive content security policy and anti-framing headers', () => {
  assert.equal(
    apiSecurityHeaders['content-security-policy'],
    "default-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  )
  assert.equal(apiSecurityHeaders['x-frame-options'], 'DENY')
  assert.equal(apiSecurityHeaders['permissions-policy'], 'camera=(), geolocation=(), microphone=()')
})

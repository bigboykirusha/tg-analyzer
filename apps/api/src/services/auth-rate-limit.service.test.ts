import test from 'node:test'
import assert from 'node:assert/strict'
import { authRateLimitFailurePolicy } from './auth-rate-limit.service'

test('authentication rate limiting is fail-closed when Redis is unavailable', () => {
  assert.equal(authRateLimitFailurePolicy.skipOnError, false)
})

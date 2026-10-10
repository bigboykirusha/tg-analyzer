import assert from 'node:assert/strict'
import test from 'node:test'
import { isOriginAllowed } from './origin-policy.service'

test('development accepts equivalent loopback hosts on the configured port', () => {
  const allowed = ['http://localhost:3000']

  assert.equal(isOriginAllowed('http://127.0.0.1:3000', allowed, 'development'), true)
  assert.equal(isOriginAllowed('http://[::1]:3000', allowed, 'development'), true)
  assert.equal(isOriginAllowed('http://127.0.0.1:3001', allowed, 'development'), false)
  assert.equal(isOriginAllowed('https://127.0.0.1:3000', allowed, 'development'), false)
})

test('production requires an exact configured origin', () => {
  const allowed = ['https://app.example.com']

  assert.equal(isOriginAllowed('https://app.example.com', allowed, 'production'), true)
  assert.equal(isOriginAllowed('https://127.0.0.1', allowed, 'production'), false)
  assert.equal(isOriginAllowed('https://app.example.com.evil.test', allowed, 'production'), false)
})

test('wildcard remains limited to non-production environments', () => {
  assert.equal(isOriginAllowed('http://192.168.1.25:3000', ['*'], 'development'), true)
  assert.equal(isOriginAllowed('https://app.example.com', ['*'], 'production'), false)
})

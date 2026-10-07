import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldRetryParseJob } from './parse-job-lifecycle.service'

test('retryable failures keep a job active until its final BullMQ attempt', () => {
  assert.equal(shouldRetryParseJob({ attemptsMade: 1, attempts: 3 }, new Error('temporary network failure')), true)
  assert.equal(shouldRetryParseJob({ attemptsMade: 3, attempts: 3 }, new Error('temporary network failure')), false)
})

test('cancellation and revoked Telegram sessions never retry', () => {
  assert.equal(shouldRetryParseJob({ attemptsMade: 1, attempts: 3 }, { name: 'ParseJobCancelledError' }), false)
  assert.equal(shouldRetryParseJob({ attemptsMade: 1, attempts: 3 }, { name: 'TelegramSessionRevokedError' }), false)
})

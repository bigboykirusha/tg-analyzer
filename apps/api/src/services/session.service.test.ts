import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeParseStatus } from './parse-status.service'

test('normalizeParseStatus returns idle when there is no active job even if cached progress is stale', () => {
  const result = normalizeParseStatus({
    activeJob: null,
    cachedProgress: {
      current: 3,
      total: 8,
      chatId: '42',
      chatName: 'Old chat',
      status: 'cancelled',
      message: 'Parse cancelled',
      scannedMessages: 120,
      startTime: Date.now() - 5000,
    },
  })

  assert.equal(result.jobId, null)
  assert.equal(result.status, 'idle')
  assert.deepEqual(result.progress, {
    current: 0,
    total: 0,
    chatId: null,
    chatName: '',
    status: 'idle',
    message: '',
    scannedMessages: 0,
  })
})

test('normalizeParseStatus keeps only active-compatible cached progress for active jobs', () => {
  const result = normalizeParseStatus({
    activeJob: {
      id: 'job-1',
      status: 'running',
      chatId: 99,
    },
    cachedProgress: {
      current: 2,
      total: 5,
      chatId: '99',
      chatName: 'Live chat',
      status: 'cancelled',
      message: 'stale terminal snapshot',
      scannedMessages: 88,
    },
  })

  assert.equal(result.jobId, 'job-1')
  assert.equal(result.status, 'running')
  assert.equal(result.progress.status, 'running')
  assert.equal(result.progress.current, 2)
  assert.equal(result.progress.total, 5)
  assert.equal(result.progress.chatId, '99')
  assert.equal(result.progress.chatName, 'Live chat')
  assert.equal(result.progress.scannedMessages, 88)
})

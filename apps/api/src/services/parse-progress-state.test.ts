import test from 'node:test'
import assert from 'node:assert/strict'
import { applyParseProgressEvent } from '@tg-analyzer/shared'
import type { ParseProgressDto } from '@tg-analyzer/shared'

const initialProgress: ParseProgressDto = {
  jobId: 'd4a87b02-ea2e-4411-b7f4-a6bbce201a20',
  current: 2,
  total: 5,
  chatId: '42',
  chatName: 'Current chat',
  status: 'running',
  message: 'Scanning',
  scannedMessages: 120,
}

test('progress events replace counters and fill protocol defaults', () => {
  const updated = applyParseProgressEvent(initialProgress, {
    type: 'progress',
    current: 3,
    total: 5,
    chatId: '43',
    chatName: 'Next chat',
  })

  assert.deepEqual(updated, {
    current: 3,
    total: 5,
    chatId: '43',
    chatName: 'Next chat',
    status: 'running',
    message: '',
    scannedMessages: 0,
  })
  assert.equal(initialProgress.current, 2)
})

test('terminal events preserve last known progress and apply final status', () => {
  const completed = applyParseProgressEvent(initialProgress, { type: 'completed' })
  const failed = applyParseProgressEvent(initialProgress, { type: 'error', message: 'Network failed' })
  const cancelled = applyParseProgressEvent(initialProgress, { type: 'cancelled', message: 'Stopped' })

  assert.deepEqual(completed, { ...initialProgress, status: 'completed', message: 'Parse completed' })
  assert.deepEqual(failed, { ...initialProgress, status: 'failed', message: 'Network failed' })
  assert.deepEqual(cancelled, { ...initialProgress, status: 'cancelled', message: 'Stopped' })
})

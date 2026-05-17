import test from 'node:test'
import assert from 'node:assert/strict'
import {
  aggregateMessage,
  createChatAccumulator,
  finalizeAccumulator,
} from './stats.service'

test('finalizeAccumulator computes private chat response metrics and session starts', () => {
  const acc = createChatAccumulator()
  const start = new Date('2026-01-01T10:00:00.000Z')

  aggregateMessage({ message: 'hey there', date: start, outgoing: false }, acc)
  aggregateMessage({ message: 'reply fast', date: new Date(start.getTime() + 60 * 60 * 1000), outgoing: true }, acc)
  aggregateMessage({ message: 'new session', date: new Date(start.getTime() + 10 * 60 * 60 * 1000), outgoing: true }, acc)
  aggregateMessage({ message: 'answer back', date: new Date(start.getTime() + 11 * 60 * 60 * 1000), outgoing: false }, acc)

  const result = finalizeAccumulator(acc, 'private')

  assert.equal(result.responseStats.medianMineSec, 3600)
  assert.equal(result.responseStats.medianTheirsSec, 3600)
  assert.equal(result.responseStats.mineSamples, 1)
  assert.equal(result.responseStats.theirsSamples, 1)
  assert.equal(result.avgResponseSec, 3600)
  assert.equal(result.iWriteFirstPct, 50)
  assert.equal(result.conversationFacts.sessionStats.totalSessions, 2)
})

test('finalizeAccumulator filters stop words and skips private-only response metrics for groups', () => {
  const acc = createChatAccumulator()

  aggregateMessage({ message: 'hello hello the and data', date: new Date('2026-01-01T10:00:00.000Z'), outgoing: true }, acc)
  aggregateMessage({ message: 'и привет data', date: new Date('2026-01-01T10:05:00.000Z'), outgoing: false }, acc)

  const result = finalizeAccumulator(acc, 'group')

  assert.deepEqual(
    result.topWords.slice(0, 3).map((item) => item.value),
    ['hello', 'data', 'привет'],
  )
  assert.equal(result.responseStats.medianMineSec, null)
  assert.equal(result.responseStats.medianTheirsSec, null)
  assert.equal(result.iWriteFirstPct, null)
})

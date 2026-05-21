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
  assert.equal(result.averageMyResponseSec, 3600)
  assert.equal(result.responseStats.mineP25Sec, 3600)
  assert.equal(result.responseStats.mineP95Sec, 3600)
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

test('aggregateMessage buckets time consistently in requested timezone', () => {
  const acc = createChatAccumulator('Asia/Tbilisi')
  aggregateMessage({ message: 'night edge', date: new Date('2026-01-01T21:30:00.000Z'), outgoing: true }, acc)
  aggregateMessage({ message: 'month edge', date: new Date('2026-01-31T22:30:00.000Z'), outgoing: false }, acc)

  const result = finalizeAccumulator(acc, 'private')

  assert.equal(result.hourlyActivity['1'], 1)
  assert.equal(result.hourlyActivity['2'], 1)
  assert.equal(result.dailyActivity.get('2026-01-02')?.sent, 1)
  assert.equal(result.dailyActivity.get('2026-02-01')?.received, 1)
  assert.equal(result.monthlyActivity.get('2026-01')?.sent, 1)
  assert.equal(result.monthlyActivity.get('2026-02')?.received, 1)
})

test('finalizeAccumulator computes response percentiles for uneven samples', () => {
  const acc = createChatAccumulator()
  const base = new Date('2026-01-01T08:00:00.000Z')

  aggregateMessage({ message: 'a', date: base, outgoing: false }, acc)
  aggregateMessage({ message: 'b', date: new Date(base.getTime() + 5 * 60 * 1000), outgoing: true }, acc)
  aggregateMessage({ message: 'c', date: new Date(base.getTime() + 15 * 60 * 1000), outgoing: false }, acc)
  aggregateMessage({ message: 'd', date: new Date(base.getTime() + 45 * 60 * 1000), outgoing: true }, acc)
  aggregateMessage({ message: 'e', date: new Date(base.getTime() + 90 * 60 * 1000), outgoing: false }, acc)
  aggregateMessage({ message: 'f', date: new Date(base.getTime() + 5 * 60 * 60 * 1000), outgoing: true }, acc)

  const result = finalizeAccumulator(acc, 'private')

  assert.equal(result.responseStats.mineSamples, 3)
  assert.equal(result.responseStats.mineP25Sec, 300)
  assert.equal(result.responseStats.medianMineSec, 1800)
  assert.equal(result.responseStats.mineP75Sec, 12600)
  assert.equal(result.responseStats.mineP95Sec, 12600)
})

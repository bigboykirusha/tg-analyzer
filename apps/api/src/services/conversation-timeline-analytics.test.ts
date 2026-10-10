import test from 'node:test'
import assert from 'node:assert/strict'
import { computeConversationTimelineAnalytics } from '@tg-analyzer/shared'

test('conversation timeline analytics calculates response and silence metrics without mutating input', () => {
  const start = new Date('2026-01-01T00:00:00.000Z')
  const timeline = [
    { timestamp: start, outgoing: true },
    { timestamp: new Date(start.getTime() + 30_000), outgoing: false },
    { timestamp: new Date(start.getTime() + 65_000), outgoing: true },
    { timestamp: new Date(start.getTime() + 10 * 60 * 60 * 1000), outgoing: false },
    { timestamp: new Date(start.getTime() + 42 * 24 * 60 * 60 * 1000), outgoing: true },
  ]
  const originalOrder = [...timeline]

  const result = computeConversationTimelineAnalytics(timeline, true)

  assert.equal(result.responseStats.theirsSamples, 1)
  assert.equal(result.responseStats.medianTheirsSec, 30)
  assert.equal(result.responseStats.mineSamples, 1)
  assert.equal(result.responseStats.medianMineSec, 35)
  assert.equal(result.averageMyResponseSec, 35)
  assert.equal(result.iWriteFirstPct, 67)
  assert.equal(result.longestGap?.seconds, 42 * 24 * 60 * 60 - 10 * 60 * 60)
  assert.equal(result.silencePeriodsOver30Days.length, 1)
  assert.deepEqual(timeline, originalOrder)
})

test('conversation timeline analytics returns empty response metrics for an empty or group timeline', () => {
  const empty = computeConversationTimelineAnalytics([], true)
  const group = computeConversationTimelineAnalytics(
    [
      { timestamp: new Date('2026-01-01T00:00:00.000Z'), outgoing: true },
      { timestamp: new Date('2026-01-01T00:00:01.000Z'), outgoing: false },
    ],
    false,
  )

  assert.equal(empty.longestGap, null)
  assert.deepEqual(empty.silencePeriodsOver30Days, [])
  assert.equal(empty.responseStats.mineSamples, 0)
  assert.equal(empty.responseRate, null)
  assert.equal(empty.iWriteFirstPct, null)
  assert.equal(group.responseStats.theirsSamples, 0)
  assert.equal(group.averageMyResponseSec, null)
  assert.equal(group.responseRate, null)
  assert.equal(group.iWriteFirstPct, null)
})

test('conversation timeline analytics includes the exact session boundary but starts a new session after it', () => {
  const start = new Date('2026-01-01T00:00:00.000Z')
  const boundaryMs = 8 * 60 * 60 * 1000
  const result = computeConversationTimelineAnalytics(
    [
      { timestamp: start, outgoing: true },
      { timestamp: new Date(start.getTime() + boundaryMs), outgoing: false },
      { timestamp: new Date(start.getTime() + boundaryMs * 2 + 1), outgoing: true },
    ],
    true,
  )

  assert.equal(result.responseStats.theirsSamples, 1)
  assert.equal(result.responseStats.mineSamples, 0)
  assert.equal(result.iWriteFirstPct, 100)
})

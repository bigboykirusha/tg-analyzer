import test from 'node:test'
import assert from 'node:assert/strict'
import { computeSessionStats } from '@tg-analyzer/shared'

test('computeSessionStats returns an empty value for an empty timeline', () => {
  assert.deepEqual(computeSessionStats([], 0, 'UTC'), {
    totalSessions: 0,
    averageSessionMessages: 0,
    averageSessionDurationSec: null,
    longestSessionMessages: 0,
    longestSessionDurationSec: null,
    sessionsPerActiveWeek: 0,
    nightSessionsPct: null,
    highlights: [],
  })
})

test('computeSessionStats splits only when the inactivity gap exceeds the boundary', () => {
  const start = new Date('2026-01-01T08:00:00.000Z')
  const timeline = [
    { timestamp: start, outgoing: true },
    { timestamp: new Date(start.getTime() + 8 * 60 * 60 * 1000), outgoing: false },
    { timestamp: new Date(start.getTime() + 16 * 60 * 60 * 1000 + 1), outgoing: true },
  ]

  const result = computeSessionStats(timeline, 7, 'UTC')

  assert.equal(result.totalSessions, 2)
  assert.equal(result.averageSessionMessages, 2)
  assert.equal(result.averageSessionDurationSec, 14_400)
  assert.equal(result.longestSessionMessages, 2)
  assert.equal(result.sessionsPerActiveWeek, 2)
  assert.equal(result.highlights[0]?.totalMessages, 2)
})

test('computeSessionStats uses the requested timezone for night sessions and does not mutate input', () => {
  const timeline = [
    { timestamp: new Date('2026-01-01T22:00:00.000Z'), outgoing: false },
    { timestamp: new Date('2026-01-02T12:00:00.000Z'), outgoing: true },
  ]
  const original = timeline.map(({ timestamp, outgoing }) => ({ timestamp: timestamp.toISOString(), outgoing }))

  const result = computeSessionStats(timeline, 14, 'Europe/Moscow')

  assert.equal(result.totalSessions, 2)
  assert.equal(result.nightSessionsPct, 50)
  assert.deepEqual(
    timeline.map(({ timestamp, outgoing }) => ({ timestamp: timestamp.toISOString(), outgoing })),
    original,
  )
})

test('computeSessionStats sorts input and ignores invalid timestamps', () => {
  const timeline = [
    { timestamp: new Date('2026-01-01T10:05:00Z'), outgoing: false },
    { timestamp: new Date('invalid'), outgoing: true },
    { timestamp: new Date('2026-01-01T10:00:00Z'), outgoing: true },
  ]
  const snapshot = [...timeline]
  const result = computeSessionStats(timeline, 1, 'UTC')

  assert.equal(result.totalSessions, 1)
  assert.equal(result.averageSessionDurationSec, 300)
  assert.equal(result.averageSessionMessages, 2)
  assert.deepEqual(timeline, snapshot)
})

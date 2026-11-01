import test from 'node:test'
import assert from 'node:assert/strict'
import { compareWithPrevious, type ChatReport, type ReportSnapshotDto } from '../src/index'

function report(days: { date: string; sent: number; received: number }[]): ChatReport {
  const daily = days.map((day) => ({ ...day, total: day.sent + day.received }))
  const sent = daily.reduce((sum, day) => sum + day.sent, 0)
  const total = daily.reduce((sum, day) => sum + day.total, 0)
  return {
    totals: { messages: total, sent, received: total - sent },
    period: { firstMessageAt: `${daily[0]!.date}T10:00:00Z`, lastMessageAt: `${daily.at(-1)!.date}T10:00:00Z` },
    activity: { daily },
  } as unknown as ChatReport
}

const previous: ReportSnapshotDto = {
  analyzedAt: '2026-01-10T12:00:00Z',
  messages: 100,
  sent: 50,
  received: 50,
  medianMineSec: null,
  medianTheirsSec: null,
  iWriteFirstPct: null,
}

const current = () =>
  report([
    { date: '2026-01-01', sent: 50, received: 50 },
    { date: '2026-01-09', sent: 20, received: 20 },
    { date: '2026-01-10', sent: 900, received: 0 },
    { date: '2026-01-11', sent: 30, received: 10 },
    { date: '2026-01-12', sent: 0, received: 900 },
  ])

test('equal full-day windows exclude both analysis days and the lifetime baseline', () => {
  const changes = compareWithPrevious(current(), previous, '2026-01-12T12:00:00Z')
  assert.equal(changes.days, 1)
  assert.deepEqual(changes.pace, { before: 40, since: 40 })
  assert.deepEqual(changes.share, { before: 50, since: 75 })
})

test('trailing silence up to the analysis date stays in the denominator', () => {
  const data = report([
    { date: '2025-10-01', sent: 1, received: 0 },
    { date: '2026-01-09', sent: 30, received: 0 },
    { date: '2026-01-11', sent: 30, received: 0 },
  ])
  const changes = compareWithPrevious(data, previous, '2026-03-12T12:00:00Z')
  assert.equal(changes.days, 60)
  assert.equal(changes.pace?.since, 0.5)
})

test('missing observation date, same-day updates and short baselines do not invent comparisons', () => {
  assert.equal(compareWithPrevious(current(), previous).pace, null)
  assert.equal(compareWithPrevious(current(), previous, 'invalid').pace, null)
  assert.equal(compareWithPrevious(current(), previous, previous.analyzedAt).pace, null)
  const data = current()
  data.period.firstMessageAt = '2026-01-10T00:00:00Z'
  assert.equal(compareWithPrevious(data, previous, '2026-01-12T12:00:00Z').pace, null)
})

test('comparison uses local dates and calendar days across DST', () => {
  const data = report([
    { date: '2026-03-01', sent: 1, received: 0 },
    { date: '2026-03-27', sent: 20, received: 20 },
    { date: '2026-03-29', sent: 30, received: 10 },
  ])
  data.timeZone = 'Europe/Berlin'
  const changes = compareWithPrevious(data, { ...previous, analyzedAt: '2026-03-27T23:30:00Z' }, '2026-03-29T22:30:00Z')
  assert.equal(changes.days, 1)
  assert.deepEqual(changes.pace, { before: 40, since: 40 })
})

test('a small sample on either side suppresses comparisons', () => {
  const data = current()
  data.activity.daily[1]!.total = 29
  assert.equal(compareWithPrevious(data, previous, '2026-01-12T12:00:00Z').share, null)
})

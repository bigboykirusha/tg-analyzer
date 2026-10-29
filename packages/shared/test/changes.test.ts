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

test('changes are measured on the days after the previous analysis', () => {
  const changes = compareWithPrevious(
    report([
      { date: '2026-01-01', sent: 50, received: 50 },
      { date: '2026-01-12', sent: 45, received: 15 },
    ]),
    previous,
  )
  assert.equal(changes.added, 60)
  assert.equal(changes.days, 2)
  // 100 messages over 10 days before, 60 over 2 days since.
  assert.deepEqual(changes.pace, { before: 10, since: 30 })
  assert.deepEqual(changes.share, { before: 50, since: 75 })
})

test('a handful of new messages gives no pace or share', () => {
  const changes = compareWithPrevious(
    report([
      { date: '2026-01-01', sent: 50, received: 50 },
      { date: '2026-01-12', sent: 3, received: 2 },
    ]),
    previous,
  )
  assert.equal(changes.added, 5)
  assert.equal(changes.pace, null)
  assert.equal(changes.share, null)
})

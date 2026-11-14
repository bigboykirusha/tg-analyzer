import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readingPulse, reportHeadline, weeklyPulse } from '../src/analytics/overview'

const day = (date: string, sent: number, received: number) => ({ date, sent, received, total: sent + received })

test('weekly pulse counts back from the last active day', () => {
  const pulse = weeklyPulse(
    [day('2026-01-01', 1, 0), day('2026-01-08', 2, 1), day('2026-01-14', 0, 3), day('2026-01-15', 4, 4)],
    26,
  )
  // 2026-01-15 is the last day: weeks end on it, so 01-09…01-15, 01-02…01-08, 12-26…01-01.
  assert.deepEqual(pulse, [
    { sent: 1, received: 0 },
    { sent: 2, received: 1 },
    { sent: 4, received: 7 },
  ])
})

test('weekly pulse keeps only the requested number of weeks', () => {
  const daily = Array.from({ length: 70 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10)
    return day(date, 1, 1)
  })
  const pulse = weeklyPulse(daily, 4)
  assert.equal(pulse.length, 4)
  assert.deepEqual(pulse.at(-1), { sent: 7, received: 7 })
})

test('weekly pulse of an empty chat is empty', () => {
  assert.deepEqual(weeklyPulse([], 26), [])
})

test('reading pulse keeps every week read while it fits', () => {
  const pulse = readingPulse([day('2025-06-01', 1, 2), day('2026-01-15', 4, 4)], 120)
  // 2025-06-01 is 32 weeks before 2026-01-15: all 33 weeks, quiet ones empty.
  assert.equal(pulse.length, 33)
  assert.deepEqual(pulse[0], { sent: 1, received: 2 })
  assert.deepEqual(pulse.at(-1), { sent: 4, received: 4 })
})

test('reading pulse folds a long history from the newest week', () => {
  const daily = Array.from({ length: 70 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10)
    return day(date, 1, 0)
  })
  const pulse = readingPulse(daily, 4)
  // 10 weeks in groups of 3 counted from the newest: 1 + 3 + 3 + 3 weeks.
  assert.deepEqual(
    pulse.map((group) => group.sent),
    [7, 21, 21, 21],
  )
  // Reading further back leaves the newest group as it was.
  const longer = readingPulse([day('2025-12-25', 1, 0), ...daily], 4)
  assert.deepEqual(longer.at(-1), pulse.at(-1))
})

test('headline numbers come from totals and responses', () => {
  const headline = reportHeadline({
    totals: { messages: 300, sent: 100, received: 200, chars: 0, words: 0, textMessages: 0 },
    responses: {
      medianMineSec: 60,
      medianTheirsSec: 180,
      mineSamples: 1,
      theirsSamples: 1,
      mineP25Sec: null,
      mineP75Sec: null,
      mineP95Sec: null,
      theirsP25Sec: null,
      theirsP75Sec: null,
      theirsP95Sec: null,
      responseRate: null,
      iWriteFirstPct: 40,
    },
  })
  assert.deepEqual(headline, { sentSharePct: 33.3, iWriteFirstPct: 40, medianMineSec: 60, medianTheirsSec: 180 })
})

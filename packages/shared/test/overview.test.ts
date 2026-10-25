import assert from 'node:assert/strict'
import { test } from 'node:test'
import { reportHeadline, weeklyPulse } from '../src/analytics/overview'

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

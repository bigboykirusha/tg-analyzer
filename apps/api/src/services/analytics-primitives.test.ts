import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateAverage,
  calculateMedian,
  calculatePercentile,
  clampNumber,
  computeMaxStreak,
  computeTrend,
} from '@tg-analyzer/shared'

test('analytics primitives handle empty and even-sized samples without mutating inputs', () => {
  const values = [9, 1, 4, 2]

  assert.equal(calculateMedian([]), null)
  assert.equal(calculateMedian(values), 3)
  assert.equal(calculateAverage([]), 0)
  assert.equal(calculateAverage(values), 4)
  assert.deepEqual(values, [9, 1, 4, 2])
})

test('analytics percentiles use nearest-rank selection and clamp score bounds', () => {
  assert.equal(calculatePercentile([], 95), null)
  assert.equal(calculatePercentile([10, 20, 30, 40], 25), 10)
  assert.equal(calculatePercentile([10, 20, 30, 40], 95), 40)
  assert.equal(calculatePercentile([10, 20, 30, 40], -1), 10)
  assert.equal(calculatePercentile([10, 20, 30, 40], 101), 40)
  assert.equal(clampNumber(-5), 0)
  assert.equal(clampNumber(130), 100)
  assert.equal(clampNumber(15, 10, 20), 15)
})

test('active day streaks deduplicate dates and remain stable across daylight-saving boundaries', () => {
  const previousTimezone = process.env.TZ
  process.env.TZ = 'America/New_York'
  try {
    assert.deepEqual(computeMaxStreak(['2026-03-29', '2026-03-28', '2026-03-29', '2026-03-31']), {
      days: 2,
      startDate: '2026-03-28',
      endDate: '2026-03-29',
    })
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ
    else process.env.TZ = previousTimezone
  }
  assert.deepEqual(computeMaxStreak([]), { days: 0, startDate: null, endDate: null })
})

test('monthly trend requires six months and compares the latest three-month window', () => {
  assert.equal(computeTrend([{ month: '2026-06', sent: 10, received: 0, total: 10 }]), 'unknown')
  assert.equal(
    computeTrend([
      { month: '2026-01', sent: 10, received: 0, total: 10 },
      { month: '2026-02', sent: 10, received: 0, total: 10 },
      { month: '2026-03', sent: 10, received: 0, total: 10 },
      { month: '2026-04', sent: 20, received: 0, total: 20 },
      { month: '2026-05', sent: 20, received: 0, total: 20 },
      { month: '2026-06', sent: 20, received: 0, total: 20 },
    ]),
    'growing',
  )
  assert.equal(
    computeTrend([
      { month: '2026-01', sent: 30, received: 0, total: 30 },
      { month: '2026-06', sent: 5, received: 0, total: 5 },
    ]),
    'fading',
  )
})

test('monthly trend excludes an incomplete current month', () => {
  const months = [
    { month: '2026-01', sent: 10, received: 0, total: 10 },
    { month: '2026-02', sent: 10, received: 0, total: 10 },
    { month: '2026-03', sent: 10, received: 0, total: 10 },
    { month: '2026-04', sent: 20, received: 0, total: 20 },
    { month: '2026-05', sent: 20, received: 0, total: 20 },
    { month: '2026-06', sent: 20, received: 0, total: 20 },
    { month: '2026-07', sent: 1, received: 0, total: 1 },
  ]

  assert.equal(computeTrend(months, '2026-07'), 'growing')
  assert.equal(computeTrend(months.slice(1), '2026-07'), 'unknown')
  assert.equal(computeTrend(months, '2026-08'), 'stable')
})

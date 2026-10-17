import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeActivityDistribution,
  computeAvailabilityProfile,
  computeCompositionStats,
  computeMaxStreak,
  computeTrend,
  fillDailyGaps,
} from '../src'

const month = (value: string, total: number) => ({ month: value, sent: total, received: 0, total })

test('streaks deduplicate dates and are stable across daylight-saving boundaries', () => {
  const previous = process.env.TZ
  process.env.TZ = 'America/New_York'
  try {
    assert.deepEqual(computeMaxStreak(['2026-03-29', '2026-03-28', '2026-03-29', '2026-03-31']), {
      days: 2,
      startDate: '2026-03-28',
      endDate: '2026-03-29',
    })
  } finally {
    if (previous === undefined) delete process.env.TZ
    else process.env.TZ = previous
  }
  assert.deepEqual(computeMaxStreak([]), { days: 0, startDate: null, endDate: null })
})

test('daily series includes quiet days without mutating input', () => {
  const items = [
    { date: '2026-03-09', sent: 2, received: 1, total: 3 },
    { date: '2026-03-07', sent: 1, received: 0, total: 1 },
  ]
  assert.deepEqual(fillDailyGaps(items), [items[1], { date: '2026-03-08', sent: 0, received: 0, total: 0 }, items[0]])
  assert.equal(items[0]?.date, '2026-03-09')
  assert.deepEqual(fillDailyGaps([]), [])
})

test('trend needs six months and compares the latest complete quarter', () => {
  assert.equal(computeTrend([month('2026-06', 10)]), 'unknown')
  const growing = ['01', '02', '03']
    .map((m) => month(`2026-${m}`, 10))
    .concat(['04', '05', '06'].map((m) => month(`2026-${m}`, 20)))
  assert.equal(computeTrend(growing), 'growing')
  assert.equal(computeTrend([month('2026-01', 30), month('2026-06', 5)]), 'fading')

  const withCurrent = [...growing, month('2026-07', 1)]
  assert.equal(computeTrend(withCurrent, '2026-07'), 'growing')
  assert.equal(computeTrend(withCurrent.slice(1), '2026-07'), 'unknown')
  assert.equal(computeTrend(withCurrent, '2026-08'), 'stable')
})

test('hours group into four parts of the day', () => {
  const hourly = Array.from({ length: 24 }, () => ({ sent: 0, received: 0, total: 0 }))
  hourly[0] = { sent: 1, received: 2, total: 3 }
  hourly[6] = { sent: 2, received: 0, total: 2 }
  hourly[12] = { sent: 0, received: 4, total: 4 }
  hourly[18] = { sent: 1, received: 1, total: 2 }
  assert.deepEqual(computeActivityDistribution(hourly), {
    night: { sent: 1, received: 2, total: 3 },
    morning: { sent: 2, received: 0, total: 2 },
    afternoon: { sent: 0, received: 4, total: 4 },
    evening: { sent: 1, received: 1, total: 2 },
  })
})

test('availability detects concentration and non-overlapping windows', () => {
  assert.deepEqual(computeAvailabilityProfile([]), {
    activeHours: 0,
    activeHoursPct: 0,
    concentrationIndex: null,
    predictability: 'low',
    peakWindow: null,
    secondaryWindow: null,
  })

  const single = Array.from({ length: 24 }, (_, hour) => (hour === 12 ? 20 : 0))
  assert.deepEqual(computeAvailabilityProfile(single), {
    activeHours: 1,
    activeHoursPct: 4.17,
    concentrationIndex: 24,
    predictability: 'high',
    peakWindow: '11:00-14:00',
    secondaryWindow: null,
  })

  const twoPeaks = Array.from({ length: 24 }, () => 0)
  Object.assign(twoPeaks, { 8: 3, 9: 7, 10: 4, 20: 5, 21: 4 })
  assert.deepEqual(computeAvailabilityProfile(twoPeaks), {
    activeHours: 5,
    activeHoursPct: 20.83,
    concentrationIndex: 7.3,
    predictability: 'high',
    peakWindow: '08:00-11:00',
    secondaryWindow: '19:00-22:00',
  })
})

test('composition percentages use classified messages', () => {
  assert.equal(
    computeCompositionStats({
      totalChars: 0,
      textMessageCount: 0,
      composition: { text: 0, media: 0, voice: 0, sticker: 0, file: 0 },
    }).textSharePct,
    null,
  )
  assert.deepEqual(
    computeCompositionStats({
      totalChars: 30,
      textMessageCount: 2,
      composition: { text: 2, media: 1, voice: 0, sticker: 1, file: 0 },
    }),
    {
      textSharePct: 50,
      mediaSharePct: 25,
      voiceSharePct: 0,
      stickerSharePct: 25,
      fileSharePct: 0,
      avgCharsPerTextMessage: 15,
    },
  )
})

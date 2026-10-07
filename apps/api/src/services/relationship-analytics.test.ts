import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeActivityDistribution,
  computeAvailabilityProfile,
  computeCompositionStats,
  computeHealthScore,
  computeRelationshipScore,
  computeResponseRate,
} from '@tg-analyzer/shared'

test('response rate counts turn changes and returns null without a comparable pair', () => {
  assert.equal(computeResponseRate([]), null)
  assert.equal(computeResponseRate([{ outgoing: true, timestamp: new Date('2026-01-01T00:00:00Z') }]), null)
  assert.equal(
    computeResponseRate([
      { outgoing: false, timestamp: new Date('2026-01-01T00:00:00Z') },
      { outgoing: true, timestamp: new Date('2026-01-01T00:01:00Z') },
      { outgoing: false, timestamp: new Date('2026-01-01T00:02:00Z') },
    ]),
    66.67,
  )
})

test('message composition handles empty inputs and reports percentages', () => {
  assert.deepEqual(
    computeCompositionStats({
      totalMessages: 0,
      totalChars: 0,
      textMessageCount: 0,
      messageComposition: { text: 0, media: 0, voice: 0, sticker: 0, file: 0 },
    }),
    {
      textSharePct: null,
      mediaSharePct: null,
      voiceSharePct: null,
      stickerSharePct: null,
      fileSharePct: null,
      avgCharsPerTextMessage: null,
    },
  )
  assert.deepEqual(
    computeCompositionStats({
      totalMessages: 4,
      totalChars: 30,
      textMessageCount: 2,
      messageComposition: { text: 2, media: 1, voice: 0, sticker: 1, file: 0 },
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

test('hour distributions include all buckets and availability detects concentration', () => {
  assert.deepEqual(
    computeActivityDistribution({
      '0': { sent: 1, received: 2, total: 3 },
      '6': { sent: 2, received: 0, total: 2 },
      '12': { sent: 0, received: 4, total: 4 },
      '18': { sent: 1, received: 1, total: 2 },
    }),
    {
      night: { sent: 1, received: 2, total: 3 },
      morning: { sent: 2, received: 0, total: 2 },
      afternoon: { sent: 0, received: 4, total: 4 },
      evening: { sent: 1, received: 1, total: 2 },
    },
  )

  const hourly = Object.fromEntries(Array.from({ length: 24 }, (_, hour) => [String(hour), hour === 12 ? 20 : 0]))
  assert.deepEqual(computeAvailabilityProfile(hourly), {
    activeHours: 1,
    activeHoursPct: 4.17,
    concentrationIndex: 24,
    predictability: 'high',
    peakWindow: '00:00-13:00',
    secondaryWindow: '00:00-02:00',
  })
})

test('relationship and health scores exclude groups and empty reports', () => {
  const responseStats = {
    medianMineSec: 60,
    medianTheirsSec: 120,
    mineSamples: 3,
    theirsSamples: 3,
    mineP25Sec: 60,
    mineP75Sec: 60,
    mineP95Sec: 60,
    theirsP25Sec: 120,
    theirsP75Sec: 120,
    theirsP95Sec: 120,
  }

  assert.equal(
    computeRelationshipScore({
      privateLike: false,
      sentMessages: 10,
      receivedMessages: 10,
      iWriteFirstPct: 50,
      responseStats,
      activeDays: 20,
      maxStreakDays: 10,
      trend: 'stable',
    }),
    null,
  )
  assert.equal(
    computeRelationshipScore({
      privateLike: true,
      sentMessages: 0,
      receivedMessages: 0,
      iWriteFirstPct: null,
      responseStats,
      activeDays: 0,
      maxStreakDays: 0,
      trend: 'unknown',
    }),
    null,
  )

  const relationship = computeRelationshipScore({
    privateLike: true,
    sentMessages: 50,
    receivedMessages: 50,
    iWriteFirstPct: 50,
    responseStats,
    activeDays: 30,
    maxStreakDays: 12,
    trend: 'stable',
  })
  assert.ok(relationship)
  assert.equal(
    computeHealthScore({
      responseRate: 80,
      sessionStats: {
        totalSessions: 10,
        averageSessionMessages: 8,
        averageSessionDurationSec: 100,
        longestSessionMessages: 20,
        longestSessionDurationSec: 300,
        sessionsPerActiveWeek: 2,
        nightSessionsPct: 10,
        highlights: [],
      },
      activeDays: 30,
      relationshipScore: relationship,
      trend: 'stable',
    })?.label,
    'strong',
  )
  assert.equal(
    computeHealthScore({
      responseRate: null,
      sessionStats: {
        totalSessions: 0,
        averageSessionMessages: 0,
        averageSessionDurationSec: null,
        longestSessionMessages: 0,
        longestSessionDurationSec: null,
        sessionsPerActiveWeek: 0,
        nightSessionsPct: null,
        highlights: [],
      },
      activeDays: 0,
      relationshipScore: null,
      trend: 'unknown',
    }),
    null,
  )
})

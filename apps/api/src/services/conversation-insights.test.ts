import test from 'node:test'
import assert from 'node:assert/strict'
import { generateConversationInsights } from '@tg-analyzer/shared'

test('generateConversationInsights returns no suggestions for an inactive, unknown conversation', () => {
  assert.deepEqual(
    generateConversationInsights({
      trend: 'unknown',
      longestGap: null,
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
      relationshipScore: null,
      responseStats: {
        medianMineSec: null,
        medianTheirsSec: null,
        mineSamples: 0,
        theirsSamples: 0,
        mineP25Sec: null,
        mineP75Sec: null,
        mineP95Sec: null,
        theirsP25Sec: null,
        theirsP75Sec: null,
        theirsP95Sec: null,
      },
    }),
    [],
  )
})

test('generateConversationInsights preserves priority and caps results at five', () => {
  const insights = generateConversationInsights({
    trend: 'growing',
    longestGap: { seconds: 45 * 24 * 60 * 60, from: '2025-01-01T00:00:00.000Z', to: '2025-02-15T00:00:00.000Z' },
    sessionStats: {
      totalSessions: 4,
      averageSessionMessages: 8,
      averageSessionDurationSec: 3 * 60 * 60,
      longestSessionMessages: 12,
      longestSessionDurationSec: 3 * 60 * 60,
      sessionsPerActiveWeek: 1,
      nightSessionsPct: 25,
      highlights: [],
    },
    relationshipScore: {
      score: 42,
      label: 'cooling',
      reciprocity: 50,
      responsiveness: 40,
      stability: 30,
      attentionBalance: 20,
    },
    responseStats: {
      medianMineSec: 14_400,
      medianTheirsSec: 3_600,
      mineSamples: 3,
      theirsSamples: 3,
      mineP25Sec: 3_600,
      mineP75Sec: 18_000,
      mineP95Sec: 21_600,
      theirsP25Sec: 1_800,
      theirsP75Sec: 7_200,
      theirsP95Sec: 10_800,
    },
  })

  assert.deepEqual(
    insights.map(({ key }) => key),
    ['session-intensity', 'long-session', 'trend-growing', 'long-gap', 'relationship-score'],
  )
  assert.equal(insights.length, 5)
  assert.equal(insights[4]?.tone, 'warning')
})

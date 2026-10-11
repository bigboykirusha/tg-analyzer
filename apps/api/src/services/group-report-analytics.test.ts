import test from 'node:test'
import assert from 'node:assert/strict'
import { computeGroupReportAnalytics, hasSufficientGroupRetentionPeriod } from '@tg-analyzer/shared'

test('computeGroupReportAnalytics counts reply coverage, builds pairs, and never mutates its input', () => {
  const firstMessageAt = new Date('2026-01-01T10:00:00.000Z')
  const secondMessageAt = new Date(firstMessageAt.getTime() + 10 * 60 * 1000)
  const thirdMessageAt = new Date(firstMessageAt.getTime() + 20 * 60 * 1000)
  const input = {
    totalMessages: 3,
    mediaCount: 0,
    voiceCount: 0,
    stickerCount: 0,
    fileCount: 0,
    firstMessageAt,
    lastMessageAt: thirdMessageAt,
    timeZone: 'UTC',
    activeDays: 1,
    now: new Date('2026-01-01T12:00:00.000Z'),
    wordCounts: new Map([
      ['launch', 3],
      ['design', 2],
    ]),
    messageIndex: new Map([
      ['1', { senderId: 'u1', senderName: 'Alex' }],
      ['2', { senderId: 'u1', senderName: 'Alex' }],
      ['3', { senderId: 'u2', senderName: 'Sam' }],
    ]),
    timeline: [
      {
        messageId: '1',
        outgoing: true,
        timestamp: firstMessageAt,
        senderId: 'u1',
        senderName: 'Alex',
        replyToMessageId: null,
      },
      {
        messageId: '2',
        outgoing: true,
        timestamp: secondMessageAt,
        senderId: 'u1',
        senderName: 'Alex',
        replyToMessageId: null,
      },
      {
        messageId: '3',
        outgoing: false,
        timestamp: thirdMessageAt,
        senderId: 'u2',
        senderName: 'Sam',
        replyToMessageId: null,
      },
    ],
    participants: [
      {
        id: 'u1',
        name: 'Alex',
        isSelf: true,
        messageCount: 2,
        textMessageCount: 2,
        wordCount: 4,
        mediaCount: 0,
        activeDays: new Set(['2026-01-01']),
        starterCount: 0,
        replyCount: 0,
        repliesReceived: 0,
        firstSeen: firstMessageAt,
        lastSeen: secondMessageAt,
        wordCounts: new Map([
          ['launch', 2],
          ['design', 2],
        ]),
        emojiCounts: new Map(),
      },
      {
        id: 'u2',
        name: 'Sam',
        isSelf: false,
        messageCount: 1,
        textMessageCount: 1,
        wordCount: 2,
        mediaCount: 0,
        activeDays: new Set(['2026-01-01']),
        starterCount: 0,
        replyCount: 0,
        repliesReceived: 0,
        firstSeen: thirdMessageAt,
        lastSeen: thirdMessageAt,
        wordCounts: new Map([
          ['launch', 1],
          ['design', 1],
        ]),
        emojiCounts: new Map(),
      },
    ],
  }

  const first = computeGroupReportAnalytics(input)
  const second = computeGroupReportAnalytics(input)

  assert.ok(first.health)
  assert.equal(first.health.responseCoverage, 50)
  assert.equal(first.health.consistency, 100)
  assert.equal(first.participants[0]?.consistencyScore, 100)
  assert.equal(first.topPairs[0]?.impliedReplies, 1)
  assert.equal(first.participants[0]?.starterCount, 1)
  assert.equal(first.participants[0]?.repliesReceived, 0)
  assert.deepEqual(second, first)
  assert.equal(input.participants[0]?.starterCount, 0)
  assert.equal(input.participants[0]?.repliesReceived, 0)
})

test('group retention requires 180 distinct calendar days', () => {
  const first = new Date('2026-01-01T12:00:00.000Z')
  assert.equal(hasSufficientGroupRetentionPeriod(first, new Date('2026-06-28T12:00:00.000Z')), false)
  assert.equal(hasSufficientGroupRetentionPeriod(first, new Date('2026-06-29T12:00:00.000Z')), true)

  const zonedFirst = new Date('2026-01-01T00:30:00.000Z')
  const zonedLast = new Date('2026-06-28T23:30:00.000Z')
  assert.equal(hasSufficientGroupRetentionPeriod(zonedFirst, zonedLast), false)
  assert.equal(hasSufficientGroupRetentionPeriod(zonedFirst, zonedLast, 'America/New_York'), true)
})

test('retention and churn use 90-day calendar windows in the report time zone', () => {
  const firstMessageAt = new Date('2026-01-01T12:00:00.000Z')
  const lastMessageAt = new Date('2026-07-31T12:00:00.000Z')
  const participants = [
    { id: 'recent', firstSeen: firstMessageAt, lastSeen: lastMessageAt },
    { id: 'old', firstSeen: firstMessageAt, lastSeen: new Date('2026-05-03T01:00:00.000Z') },
    { id: 'late', firstSeen: new Date('2026-04-01T05:00:00.000Z'), lastSeen: lastMessageAt },
  ].map(({ id, firstSeen, lastSeen }) => ({
    id,
    name: id,
    isSelf: false,
    messageCount: 1,
    textMessageCount: 1,
    wordCount: 1,
    mediaCount: 0,
    activeDays: new Set(['2026-01-01']),
    starterCount: 0,
    replyCount: 0,
    repliesReceived: 0,
    firstSeen,
    lastSeen,
    wordCounts: new Map<string, number>(),
    emojiCounts: new Map<string, number>(),
  }))

  const report = computeGroupReportAnalytics({
    totalMessages: 3,
    mediaCount: 0,
    voiceCount: 0,
    stickerCount: 0,
    fileCount: 0,
    firstMessageAt,
    lastMessageAt,
    timeZone: 'America/New_York',
    activeDays: 2,
    now: lastMessageAt,
    wordCounts: new Map(),
    messageIndex: new Map(),
    timeline: [],
    participants,
  })

  assert.equal(report.health?.retentionRate, 50)
  assert.equal(report.health?.churnedMembers, 1)
})

test('computeGroupReportAnalytics does not invent health for an empty group', () => {
  const report = computeGroupReportAnalytics({
    totalMessages: 0,
    mediaCount: 0,
    voiceCount: 0,
    stickerCount: 0,
    fileCount: 0,
    firstMessageAt: null,
    lastMessageAt: null,
    timeZone: 'UTC',
    activeDays: 0,
    now: new Date('2026-01-01T12:00:00.000Z'),
    wordCounts: new Map(),
    messageIndex: new Map(),
    timeline: [],
    participants: [],
  })

  assert.equal(report.health, null)
  assert.deepEqual(report.participants, [])
  assert.deepEqual(report.topPairs, [])
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { computeGroupReportAnalytics } from '@tg-analyzer/shared'

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
  assert.equal(first.health.responseCoverage, 66.7)
  assert.equal(first.topPairs[0]?.impliedReplies, 1)
  assert.equal(first.participants[0]?.starterCount, 1)
  assert.equal(first.participants[0]?.repliesReceived, 0)
  assert.deepEqual(second, first)
  assert.equal(input.participants[0]?.starterCount, 0)
  assert.equal(input.participants[0]?.repliesReceived, 0)
})

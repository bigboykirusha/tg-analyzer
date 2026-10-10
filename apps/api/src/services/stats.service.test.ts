import test from 'node:test'
import assert from 'node:assert/strict'
import {
  aggregateMessage,
  createChatAccumulator,
  finalizeAccumulator,
  resolveProductGroupRole,
} from '@tg-analyzer/shared'

test('resolveProductGroupRole keeps recently active top members out of inactive roles', () => {
  const now = new Date('2026-05-22T00:00:00.000Z')

  assert.equal(
    resolveProductGroupRole(
      {
        role: 'lurker',
        messageShare: 28.4,
        consistencyScore: 12,
        starterShare: 28.9,
        firstSeen: '2025-01-01T00:00:00.000Z',
        lastSeen: '2026-05-21T00:00:00.000Z',
        messageCount: 1532,
      },
      now,
    ),
    'anchor',
  )

  assert.equal(
    resolveProductGroupRole(
      {
        role: 'contributor',
        messageShare: 0.1,
        consistencyScore: 0.1,
        starterShare: 0,
        firstSeen: '2026-05-15T00:00:00.000Z',
        lastSeen: '2026-05-21T00:00:00.000Z',
        messageCount: 6,
      },
      now,
    ),
    'newcomer',
  )

  assert.equal(
    resolveProductGroupRole(
      {
        role: 'anchor',
        messageShare: 28.4,
        consistencyScore: 20,
        starterShare: 30,
        firstSeen: '2025-01-01T00:00:00.000Z',
        lastSeen: '2026-01-01T00:00:00.000Z',
        messageCount: 1532,
      },
      now,
    ),
    'inactive',
  )
})

test('finalizeAccumulator computes private chat response metrics and session starts', () => {
  const acc = createChatAccumulator()
  const start = new Date('2026-01-01T10:00:00.000Z')

  aggregateMessage({ message: 'hey there', date: start, outgoing: false }, acc)
  aggregateMessage({ message: 'reply fast', date: new Date(start.getTime() + 60 * 60 * 1000), outgoing: true }, acc)
  aggregateMessage(
    { message: 'new session', date: new Date(start.getTime() + 10 * 60 * 60 * 1000), outgoing: true },
    acc,
  )
  aggregateMessage(
    { message: 'answer back', date: new Date(start.getTime() + 11 * 60 * 60 * 1000), outgoing: false },
    acc,
  )

  const result = finalizeAccumulator(acc, 'private')

  assert.equal(result.responseStats.medianMineSec, 3600)
  assert.equal(result.responseStats.medianTheirsSec, 3600)
  assert.equal(result.responseStats.mineSamples, 1)
  assert.equal(result.responseStats.theirsSamples, 1)
  assert.equal(result.averageMyResponseSec, 3600)
  assert.equal(result.responseStats.mineP25Sec, 3600)
  assert.equal(result.responseStats.mineP95Sec, 3600)
  assert.equal(result.iWriteFirstPct, 50)
  assert.equal(result.conversationFacts.sessionStats.totalSessions, 2)
})

test('finalizeAccumulator filters stop words and skips private-only response metrics for groups', () => {
  const acc = createChatAccumulator()

  aggregateMessage(
    { message: 'hello hello the and data', date: new Date('2026-01-01T10:00:00.000Z'), outgoing: true },
    acc,
  )
  aggregateMessage({ message: 'и привет data', date: new Date('2026-01-01T10:05:00.000Z'), outgoing: false }, acc)

  const result = finalizeAccumulator(acc, 'group')

  assert.deepEqual(
    result.topWords.slice(0, 3).map((item) => item.value),
    ['hello', 'data', 'привет'],
  )
  assert.equal(result.responseStats.medianMineSec, null)
  assert.equal(result.responseStats.medianTheirsSec, null)
  assert.equal(result.iWriteFirstPct, null)
})

test('aggregateMessage buckets time consistently in requested timezone', () => {
  const acc = createChatAccumulator('Asia/Tbilisi')
  aggregateMessage({ message: 'night edge', date: new Date('2026-01-01T21:30:00.000Z'), outgoing: true }, acc)
  aggregateMessage({ message: 'month edge', date: new Date('2026-01-31T22:30:00.000Z'), outgoing: false }, acc)

  const result = finalizeAccumulator(acc, 'private')

  assert.equal(result.hourlyActivity['1'], 1)
  assert.equal(result.hourlyActivity['2'], 1)
  assert.equal(result.dailyActivity.get('2026-01-02')?.sent, 1)
  assert.equal(result.dailyActivity.get('2026-02-01')?.received, 1)
  assert.equal(result.monthlyActivity.get('2026-01')?.sent, 1)
  assert.equal(result.monthlyActivity.get('2026-02')?.received, 1)
})

test('text averages include captions without changing the primary composition type', () => {
  const acc = createChatAccumulator('UTC')
  aggregateMessage(
    { message: 'photo caption', media: true, date: new Date('2026-01-01T10:00:00.000Z'), outgoing: true },
    acc,
  )
  aggregateMessage({ message: '', sticker: true, date: new Date('2026-01-01T10:01:00.000Z'), outgoing: false }, acc)

  const result = finalizeAccumulator(acc, 'private')
  assert.equal(result.textMessageCount, 1)
  assert.deepEqual(result.messageComposition, { text: 0, media: 1, voice: 0, sticker: 1, file: 0 })
  assert.equal(result.wordsPerMessage.mine, 2)
  assert.equal(result.compositionStats.avgCharsPerTextMessage, 13)
})

test('finalizeAccumulator computes response percentiles for uneven samples', () => {
  const acc = createChatAccumulator()
  const base = new Date('2026-01-01T08:00:00.000Z')

  aggregateMessage({ message: 'a', date: base, outgoing: false }, acc)
  aggregateMessage({ message: 'b', date: new Date(base.getTime() + 5 * 60 * 1000), outgoing: true }, acc)
  aggregateMessage({ message: 'c', date: new Date(base.getTime() + 15 * 60 * 1000), outgoing: false }, acc)
  aggregateMessage({ message: 'd', date: new Date(base.getTime() + 45 * 60 * 1000), outgoing: true }, acc)
  aggregateMessage({ message: 'e', date: new Date(base.getTime() + 90 * 60 * 1000), outgoing: false }, acc)
  aggregateMessage({ message: 'f', date: new Date(base.getTime() + 5 * 60 * 60 * 1000), outgoing: true }, acc)

  const result = finalizeAccumulator(acc, 'private')

  assert.equal(result.responseStats.mineSamples, 3)
  assert.equal(result.responseStats.mineP25Sec, 300)
  assert.equal(result.responseStats.medianMineSec, 1800)
  assert.equal(result.responseStats.mineP75Sec, 12600)
  assert.equal(result.responseStats.mineP95Sec, 12600)
})

test('finalizeAccumulator builds group participant and interaction analytics', () => {
  const acc = createChatAccumulator()
  const base = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)

  aggregateMessage(
    { id: 1, senderId: 'self', senderName: 'You', message: 'launch plan alpha', date: base, outgoing: true },
    acc,
  )
  aggregateMessage(
    {
      id: 2,
      senderId: 'u2',
      senderName: 'Nina',
      message: 'alpha sounds good 👍',
      date: new Date(base.getTime() + 5 * 60 * 1000),
      outgoing: false,
      replyToMessageId: 1,
    },
    acc,
  )
  aggregateMessage(
    {
      id: 3,
      senderId: 'u3',
      senderName: 'Max',
      message: 'i can help with launch',
      date: new Date(base.getTime() + 8 * 60 * 1000),
      outgoing: false,
    },
    acc,
  )
  aggregateMessage(
    {
      id: 4,
      senderId: 'self',
      senderName: 'You',
      message: 'great, take the landing page',
      date: new Date(base.getTime() + 12 * 60 * 1000),
      outgoing: true,
      replyToMessageId: 3,
    },
    acc,
  )
  aggregateMessage(
    {
      id: 5,
      senderId: 'u2',
      senderName: 'Nina',
      message: 'i will prepare visuals',
      date: new Date(base.getTime() + 5 * 60 * 60 * 1000),
      outgoing: false,
    },
    acc,
  )

  const result = finalizeAccumulator(acc, 'group')

  assert.ok(result.groupReport)
  assert.equal(result.groupReport?.participants.length, 3)
  assert.equal(result.groupReport?.participants[0]?.name, 'You')
  assert.equal(result.groupReport?.participants[0]?.role, 'anchor')
  assert.equal(result.groupReport?.participants[0]?.messageCount, 2)
  assert.ok(
    result.groupReport?.topPairs.some((pair) =>
      ['You', 'Max'].every((name) => [pair.leftParticipantName, pair.rightParticipantName].includes(name)),
    ),
  )
  assert.equal(result.groupReport?.health?.activeMembers, 3)
  assert.equal(result.groupReport?.health?.activeMembersLast30Days, 3)
  assert.ok((result.groupReport?.sharedVocabulary.length ?? 0) >= 0)
})

test('finalizeAccumulator can be repeated without accumulating group interaction counters', () => {
  const acc = createChatAccumulator()
  const start = new Date('2026-01-01T10:00:00.000Z')
  aggregateMessage({ id: 1, senderId: 'self', outgoing: true, message: 'start topic', date: start }, acc)
  aggregateMessage(
    {
      id: 2,
      senderId: 'other',
      outgoing: false,
      message: 'reply topic',
      date: new Date(start.getTime() + 60_000),
      replyToMessageId: 1,
    },
    acc,
  )

  const first = finalizeAccumulator(acc, 'group')
  const interactionCounts = (result: ReturnType<typeof finalizeAccumulator>) =>
    result.groupReport?.participants.map(({ id, starterCount, replyCount, repliesReceived }) => ({
      id,
      starterCount,
      replyCount,
      repliesReceived,
    }))
  const firstCounts = interactionCounts(first)
  const second = finalizeAccumulator(acc, 'group')

  assert.deepEqual(interactionCounts(second), firstCounts)
})

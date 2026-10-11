import test from 'node:test'
import assert from 'node:assert/strict'
import { toChatDto } from './chat-stats.mapper'

type ChatStatsRow = Parameters<typeof toChatDto>[0]

function rowWith(overrides: Record<string, unknown>): ChatStatsRow {
  return {
    tgChatId: 1,
    chatName: 'Test chat',
    chatType: 'private',
    totalMessages: 0,
    sentMessages: 0,
    receivedMessages: 0,
    totalChars: 0,
    totalWords: 0,
    textMessageCount: 0,
    mediaCount: 0,
    voiceCount: 0,
    stickerCount: 0,
    fileCount: 0,
    firstMessageAt: null,
    lastMessageAt: null,
    parsedAt: null,
    averageMyResponseSec: null,
    medianMyResponseSec: null,
    medianTheirResponseSec: null,
    myWordsPerMessage: null,
    theirWordsPerMessage: null,
    iWriteFirstPct: null,
    responseRate: null,
    topWords: [],
    topEmoji: [],
    hourlyActivity: {},
    dailyActivity: [],
    weekdayActivity: {},
    monthlyActivity: [],
    hourlyActivitySplit: {},
    topWordsBySender: { mine: [], theirs: [] },
    topEmojiBySender: { mine: [], theirs: [] },
    uniqueWordsBySender: { mine: [], theirs: [] },
    responseStats: null,
    messageComposition: null,
    healthScore: null,
    conversationFacts: null,
    wordsPerMessage: { mine: null, theirs: null },
    groupParticipants: [],
    groupTopPairs: [],
    groupHealth: null,
    sharedVocabulary: [],
    uniqueGroupWords: [],
    ...overrides,
  } as unknown as ChatStatsRow
}

test('partial stored scores are not presented as calculated zero scores', () => {
  const report = toChatDto(
    rowWith({
      healthScore: { responseRate: 50 },
      conversationFacts: { relationshipScore: { reciprocity: 50 } },
      groupHealth: { giniCoefficient: 0.2 },
    }),
  )

  assert.equal(report.healthScore, null)
  assert.equal(report.conversationFacts.relationshipScore, null)
  assert.equal(report.groupReport, null)

  const invalid = toChatDto(
    rowWith({
      healthScore: { score: 150, label: 'steady' },
      conversationFacts: { relationshipScore: { score: 25, label: 'unknown' } },
    }),
  )
  assert.equal(invalid.healthScore, null)
  assert.equal(invalid.conversationFacts.relationshipScore, null)
})

test('valid stored zero scores are preserved', () => {
  const report = toChatDto(
    rowWith({
      healthScore: { score: 0, label: 'fragile' },
      conversationFacts: { relationshipScore: { score: 0, label: 'emerging' } },
      groupHealth: {
        giniCoefficient: 0,
        lurkerRatio: 0,
        retentionRate: null,
        responseCoverage: 0,
        consistency: 0,
        momentum: 'unknown',
        activeMembers: 0,
        activeMembersLast30Days: 0,
        churnedMembers: 0,
        peakSimultaneity: 0,
      },
    }),
  )

  assert.equal(report.healthScore?.score, 0)
  assert.equal(report.conversationFacts.relationshipScore?.score, 0)
  assert.equal(report.groupReport?.health?.giniCoefficient, 0)
})

test('legacy composition does not invent a text-bearing message count', () => {
  const report = toChatDto(
    rowWith({
      totalMessages: 3,
      totalWords: 6,
      totalChars: 30,
      mediaCount: 1,
      textMessageCount: 0,
      messageComposition: { text: 0, media: 0, voice: 0, sticker: 0, file: 0 },
    }),
  )

  assert.equal(report.textMessageCount, 0)
  assert.deepEqual(report.messageComposition, { text: 2, media: 1, voice: 0, sticker: 0, file: 0 })
  assert.equal(report.compositionStats.textSharePct, 66.67)
  assert.equal(report.compositionStats.avgCharsPerTextMessage, null)
})

test('stored group roles remain fixed and legacy roles use the report date', () => {
  const participant = {
    id: 'member',
    name: 'Member',
    messageShare: 20,
    consistencyScore: 10,
    starterShare: 20,
    messageCount: 200,
    firstSeen: '2025-01-01T00:00:00.000Z',
    lastSeen: '2025-01-02T00:00:00.000Z',
  }
  const parsedAt = new Date('2025-01-03T00:00:00.000Z')

  const stored = toChatDto(rowWith({ parsedAt, groupParticipants: [{ ...participant, role: 'newcomer' }] }))
  const legacy = toChatDto(rowWith({ parsedAt, groupParticipants: [{ ...participant, role: 'lurker' }] }))

  assert.equal(stored.groupReport?.participants[0]?.role, 'newcomer')
  assert.equal(legacy.groupReport?.participants[0]?.role, 'anchor')
})

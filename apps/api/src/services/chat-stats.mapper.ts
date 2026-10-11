import type {
  ActivityDistributionDto,
  AvailabilityProfileDto,
  ChatStatsDto,
  CompositionStatsDto,
  ConversationFactsDto,
  DirectionalCountDto,
  GroupParticipantDto,
  GroupReportDto,
  HealthScoreDto,
  MessageCompositionDto,
  RelationshipScoreDto,
  ResponseStatsDto,
  TopItemDto,
} from '@tg-analyzer/shared'
import {
  computeActivityDistribution,
  computeAvailabilityProfile,
  computeCompositionStats,
  resolveProductGroupRole,
} from '@tg-analyzer/shared'
import { schema } from '../db'

const HEALTH_LABELS: ReadonlySet<string> = new Set<HealthScoreDto['label']>([
  'strong',
  'steady',
  'fragile',
  'imbalanced',
])
const RELATIONSHIP_LABELS: ReadonlySet<string> = new Set<RelationshipScoreDto['label']>([
  'balanced',
  'warm',
  'cooling',
  'one_sided',
  'emerging',
])

function isValidScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
}

function normalizeStoredGroupRole(
  participant: Omit<GroupParticipantDto, 'role'> & { role?: string | null },
  reportAsOf: Date,
): GroupParticipantDto['role'] {
  if (
    participant.role === 'anchor' ||
    participant.role === 'contributor' ||
    participant.role === 'newcomer' ||
    participant.role === 'inactive'
  ) {
    return participant.role
  }
  return resolveProductGroupRole(
    {
      messageShare: participant.messageShare,
      consistencyScore: participant.consistencyScore,
      starterShare: participant.starterShare,
      firstSeen: participant.firstSeen,
      lastSeen: participant.lastSeen,
      messageCount: participant.messageCount,
    },
    reportAsOf,
  )
}

function normalizeConversationFacts(
  value: (typeof schema.chatStats.$inferSelect)['conversationFacts'],
): ConversationFactsDto {
  const sessionStats = value?.sessionStats
  const relationshipScore = value?.relationshipScore

  return {
    activeDays: value?.activeDays ?? 0,
    longestGap: value?.longestGap ?? null,
    mostActiveDate: value?.mostActiveDate ?? null,
    maxStreakDays: value?.maxStreakDays ?? 0,
    maxStreak: value?.maxStreak ?? null,
    firstMessageAt: value?.firstMessageAt ?? null,
    silencePeriodsOver30Days: Array.isArray(value?.silencePeriodsOver30Days) ? value.silencePeriodsOver30Days : [],
    trend: value?.trend ?? 'unknown',
    mostActiveMonth: value?.mostActiveMonth ?? null,
    sessionStats: {
      totalSessions: sessionStats?.totalSessions ?? 0,
      averageSessionMessages: sessionStats?.averageSessionMessages ?? 0,
      averageSessionDurationSec: sessionStats?.averageSessionDurationSec ?? null,
      longestSessionMessages: sessionStats?.longestSessionMessages ?? 0,
      longestSessionDurationSec: sessionStats?.longestSessionDurationSec ?? null,
      sessionsPerActiveWeek: sessionStats?.sessionsPerActiveWeek ?? 0,
      nightSessionsPct: sessionStats?.nightSessionsPct ?? null,
      highlights: Array.isArray(sessionStats?.highlights) ? sessionStats.highlights : [],
    },
    relationshipScore:
      relationshipScore && isValidScore(relationshipScore.score) && RELATIONSHIP_LABELS.has(relationshipScore.label)
        ? {
            score: relationshipScore.score,
            label: relationshipScore.label,
            reciprocity: relationshipScore.reciprocity ?? null,
            responsiveness: relationshipScore.responsiveness ?? null,
            stability: relationshipScore.stability ?? null,
            attentionBalance: relationshipScore.attentionBalance ?? null,
          }
        : null,
    insights: Array.isArray(value?.insights) ? value.insights : [],
  }
}

function normalizeResponseStats(value: (typeof schema.chatStats.$inferSelect)['responseStats']): ResponseStatsDto {
  return {
    medianMineSec: value?.medianMineSec ?? null,
    medianTheirsSec: value?.medianTheirsSec ?? null,
    mineSamples: value?.mineSamples ?? 0,
    theirsSamples: value?.theirsSamples ?? 0,
    mineP25Sec: value?.mineP25Sec ?? null,
    mineP75Sec: value?.mineP75Sec ?? null,
    mineP95Sec: value?.mineP95Sec ?? null,
    theirsP25Sec: value?.theirsP25Sec ?? null,
    theirsP75Sec: value?.theirsP75Sec ?? null,
    theirsP95Sec: value?.theirsP95Sec ?? null,
  }
}

function resolveActivityDistribution(row: typeof schema.chatStats.$inferSelect): ActivityDistributionDto {
  return computeActivityDistribution(row.hourlyActivitySplit as Record<string, DirectionalCountDto>)
}

function resolveCompositionStats(
  row: typeof schema.chatStats.$inferSelect,
  messageComposition: MessageCompositionDto,
  textMessageCount: number,
): CompositionStatsDto {
  return computeCompositionStats({
    totalChars: row.totalChars ?? 0,
    textMessageCount,
    messageComposition,
  })
}

function resolveAvailabilityProfile(row: typeof schema.chatStats.$inferSelect): AvailabilityProfileDto {
  return computeAvailabilityProfile(row.hourlyActivity as Record<string, number>)
}

function normalizeHealthScore(value: (typeof schema.chatStats.$inferSelect)['healthScore']): HealthScoreDto | null {
  if (!value || !isValidScore(value.score) || !HEALTH_LABELS.has(value.label)) {
    return null
  }

  return {
    score: value.score,
    label: value.label,
    responseRate: value.responseRate ?? null,
    fragmentation: value.fragmentation ?? null,
    initiativeBalance: value.initiativeBalance ?? null,
    longTermStability: value.longTermStability ?? null,
  }
}

function normalizeGroupReport(row: typeof schema.chatStats.$inferSelect): GroupReportDto | null {
  const participants = Array.isArray(row.groupParticipants)
    ? row.groupParticipants.map((participant) => ({
        ...participant,
        role: normalizeStoredGroupRole(
          participant,
          row.parsedAt ?? row.lastMessageAt ?? (participant.lastSeen ? new Date(participant.lastSeen) : new Date(0)),
        ),
      }))
    : []
  const topPairs = Array.isArray(row.groupTopPairs) ? row.groupTopPairs : []
  const sharedVocabulary = Array.isArray(row.sharedVocabulary) ? row.sharedVocabulary : []
  const uniqueGroupWords = Array.isArray(row.uniqueGroupWords) ? row.uniqueGroupWords : []
  const health = row.groupHealth
  const completeHealth =
    health &&
    [
      health.giniCoefficient,
      health.lurkerRatio,
      health.responseCoverage,
      health.consistency,
      health.activeMembers,
      health.activeMembersLast30Days,
      health.churnedMembers,
      health.peakSimultaneity,
    ].every(Number.isFinite)

  if (
    !participants.length &&
    !topPairs.length &&
    !sharedVocabulary.length &&
    !uniqueGroupWords.length &&
    !completeHealth
  ) {
    return null
  }

  return {
    participants,
    topPairs,
    health: completeHealth
      ? {
          giniCoefficient: health.giniCoefficient,
          lurkerRatio: health.lurkerRatio,
          retentionRate: health.retentionRate ?? null,
          responseCoverage: health.responseCoverage,
          consistency: health.consistency,
          momentum: health.momentum ?? 'unknown',
          activeMembers: health.activeMembers,
          activeMembersLast30Days: health.activeMembersLast30Days,
          churnedMembers: health.churnedMembers,
          peakSimultaneity: health.peakSimultaneity,
        }
      : null,
    sharedVocabulary,
    uniqueGroupWords,
  }
}

function resolveMessageComposition(row: typeof schema.chatStats.$inferSelect): MessageCompositionDto {
  const storedComposition = row.messageComposition ?? null
  const storedCompositionTotal = storedComposition
    ? storedComposition.text +
      storedComposition.media +
      storedComposition.voice +
      storedComposition.sticker +
      storedComposition.file
    : 0

  if (storedComposition && storedCompositionTotal > 0) {
    return storedComposition
  }

  return {
    text: Math.max(
      (row.totalMessages ?? 0) -
        (row.mediaCount ?? 0) -
        (row.voiceCount ?? 0) -
        (row.stickerCount ?? 0) -
        (row.fileCount ?? 0),
      0,
    ),
    media: row.mediaCount ?? 0,
    voice: row.voiceCount ?? 0,
    sticker: row.stickerCount ?? 0,
    file: row.fileCount ?? 0,
  }
}

export function toChatDto(row: typeof schema.chatStats.$inferSelect): ChatStatsDto {
  const textMessageCount = Math.max(0, row.textMessageCount ?? 0)
  const messageComposition = resolveMessageComposition(row)
  const responseStats = normalizeResponseStats(row.responseStats)

  return {
    tgChatId: String(row.tgChatId),
    chatName: row.chatName,
    chatType: row.chatType,
    totalMessages: row.totalMessages,
    sentMessages: row.sentMessages,
    receivedMessages: row.receivedMessages,
    totalChars: row.totalChars,
    totalWords: row.totalWords,
    textMessageCount,
    mediaCount: row.mediaCount,
    voiceCount: row.voiceCount,
    stickerCount: row.stickerCount,
    fileCount: row.fileCount,
    firstMessageAt: row.firstMessageAt?.toISOString() ?? null,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    parsedAt: row.parsedAt?.toISOString() ?? null,
    averageMyResponseSec: row.averageMyResponseSec,
    medianMyResponseSec: row.medianMyResponseSec,
    medianTheirResponseSec: row.medianTheirResponseSec,
    myWordsPerMessage: numberOrNull(row.myWordsPerMessage),
    theirWordsPerMessage: numberOrNull(row.theirWordsPerMessage),
    iWriteFirstPct: row.iWriteFirstPct,
    responseRate: numberOrNull(row.responseRate),
    topWords: row.topWords as TopItemDto[],
    topEmoji: row.topEmoji as TopItemDto[],
    hourlyActivity: row.hourlyActivity as Record<string, number>,
    dailyActivity: row.dailyActivity,
    weekdayActivity: row.weekdayActivity,
    monthlyActivity: row.monthlyActivity,
    hourlyActivitySplit: row.hourlyActivitySplit,
    topWordsBySender: row.topWordsBySender,
    topEmojiBySender: row.topEmojiBySender,
    uniqueWordsBySender: row.uniqueWordsBySender,
    responseStats,
    messageComposition,
    activityDistribution: resolveActivityDistribution(row),
    compositionStats: resolveCompositionStats(row, messageComposition, textMessageCount),
    availabilityProfile: resolveAvailabilityProfile(row),
    healthScore: normalizeHealthScore(row.healthScore),
    groupReport: normalizeGroupReport(row),
    conversationFacts: normalizeConversationFacts(row.conversationFacts),
    wordsPerMessage: row.wordsPerMessage,
  }
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined) {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

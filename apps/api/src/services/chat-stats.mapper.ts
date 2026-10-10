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

function resolveGroupRole(params: {
  messageShare: number
  consistencyScore: number
  starterShare: number
  firstSeen: Date | string | null
  lastSeen: Date | string | null
  messageCount: number
  now: Date
}): GroupParticipantDto['role'] {
  return resolveProductGroupRole(params, params.now)
}

function normalizeStoredGroupRole(
  participant: Omit<GroupParticipantDto, 'role'> & { role?: string | null },
  now = new Date(),
): GroupParticipantDto['role'] {
  return resolveGroupRole({ ...participant, now })
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
    relationshipScore: relationshipScore
      ? {
          score: relationshipScore.score ?? 0,
          label: relationshipScore.label ?? 'balanced',
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
    totalMessages: row.totalMessages ?? 0,
    totalChars: row.totalChars ?? 0,
    textMessageCount,
    messageComposition,
  })
}

function resolveAvailabilityProfile(row: typeof schema.chatStats.$inferSelect): AvailabilityProfileDto {
  return computeAvailabilityProfile(row.hourlyActivity as Record<string, number>)
}

function normalizeHealthScore(value: (typeof schema.chatStats.$inferSelect)['healthScore']): HealthScoreDto | null {
  if (!value) {
    return null
  }

  return {
    score: value.score ?? 0,
    label: value.label ?? 'steady',
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
        role: normalizeStoredGroupRole(participant),
      }))
    : []
  const topPairs = Array.isArray(row.groupTopPairs) ? row.groupTopPairs : []
  const sharedVocabulary = Array.isArray(row.sharedVocabulary) ? row.sharedVocabulary : []
  const uniqueGroupWords = Array.isArray(row.uniqueGroupWords) ? row.uniqueGroupWords : []
  const health = row.groupHealth

  if (!participants.length && !topPairs.length && !sharedVocabulary.length && !uniqueGroupWords.length && !health) {
    return null
  }

  return {
    participants,
    topPairs,
    health: health
      ? {
          score: health.score ?? 0,
          giniCoefficient: health.giniCoefficient ?? 0,
          lurkerRatio: health.lurkerRatio ?? 0,
          retentionRate: health.retentionRate ?? 0,
          responseCoverage: health.responseCoverage ?? 0,
          consistency: health.consistency ?? 0,
          momentum: health.momentum ?? 'stable',
          activeMembers: health.activeMembers ?? participants.length,
          activeMembersLast30Days: health.activeMembersLast30Days ?? 0,
          churnedMembers: health.churnedMembers ?? 0,
          peakSimultaneity: health.peakSimultaneity ?? 0,
        }
      : null,
    sharedVocabulary,
    uniqueGroupWords,
  }
}

function resolveTextMessageCount(row: typeof schema.chatStats.$inferSelect) {
  if ((row.textMessageCount ?? 0) > 0) {
    return row.textMessageCount
  }

  return Math.max(
    (row.totalMessages ?? 0) -
      (row.mediaCount ?? 0) -
      (row.voiceCount ?? 0) -
      (row.stickerCount ?? 0) -
      (row.fileCount ?? 0),
    0,
  )
}

function resolveMessageComposition(
  row: typeof schema.chatStats.$inferSelect,
  textMessageCount: number,
): MessageCompositionDto {
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
    text: textMessageCount,
    media: row.mediaCount ?? 0,
    voice: row.voiceCount ?? 0,
    sticker: row.stickerCount ?? 0,
    file: row.fileCount ?? 0,
  }
}

export function toChatDto(row: typeof schema.chatStats.$inferSelect): ChatStatsDto {
  const textMessageCount = resolveTextMessageCount(row)
  const messageComposition = resolveMessageComposition(row, textMessageCount)
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

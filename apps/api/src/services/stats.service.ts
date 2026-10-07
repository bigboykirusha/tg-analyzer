import type {
  ActivityDistributionDto,
  AvailabilityProfileDto,
  ChatStatsDto,
  CompositionStatsDto,
  ConversationFactsDto,
  DirectionalCountDto,
  GlobalStatsDto,
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
  createChatAccumulator,
  finalizeAccumulator,
  mapDailyActivity,
  mapMonthlyActivity,
  mapToTopItems,
  resolveProductGroupRole,
} from '@tg-analyzer/shared'
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { db, schema } from '../db'

export { aggregateMessage, createChatAccumulator, finalizeAccumulator } from '@tg-analyzer/shared'
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

export async function saveAggregates(params: {
  userId: string
  jobId?: string
  chat: {
    id: number
    title: string | null
    type: string | null
  }
  stats: ReturnType<typeof createChatAccumulator>
}) {
  const finalStats = finalizeAccumulator(params.stats, params.chat.type)
  const dailyActivityJson = mapDailyActivity(finalStats.dailyActivity)
  const monthlyActivityJson = mapMonthlyActivity(finalStats.monthlyActivity)
  await db.transaction(async (tx) => {
    const lockedUser = await tx.execute(sql`SELECT id FROM users WHERE id = ${params.userId} FOR UPDATE`)
    if (lockedUser.rowCount !== 1) {
      throw new Error('User no longer exists')
    }

    if (params.jobId) {
      const currentJob = await tx.query.parseJobs.findFirst({
        where: and(
          eq(schema.parseJobs.id, params.jobId),
          eq(schema.parseJobs.userId, params.userId),
          eq(schema.parseJobs.status, 'running'),
        ),
      })
      if (!currentJob) {
        throw new Error('Parse job is no longer active')
      }
    }

    await tx
      .insert(schema.chatStats)
      .values({
        userId: params.userId,
        tgChatId: params.chat.id,
        chatName: params.chat.title,
        chatType: params.chat.type,
        totalMessages: finalStats.totalMessages,
        sentMessages: finalStats.sentMessages,
        receivedMessages: finalStats.receivedMessages,
        totalChars: finalStats.totalChars,
        totalWords: finalStats.totalWords,
        textMessageCount: finalStats.textMessageCount,
        mediaCount: finalStats.mediaCount,
        voiceCount: finalStats.voiceCount,
        stickerCount: finalStats.stickerCount,
        fileCount: finalStats.fileCount,
        firstMessageAt: finalStats.firstMessageAt,
        lastMessageAt: finalStats.lastMessageAt,
        averageMyResponseSec: finalStats.averageMyResponseSec,
        medianMyResponseSec: finalStats.medianMyResponseSec,
        medianTheirResponseSec: finalStats.medianTheirResponseSec,
        iWriteFirstPct: finalStats.iWriteFirstPct,
        responseRate: decimalOrNull(finalStats.responseRate),
        parsedAt: new Date(),
        myWordsPerMessage: decimalOrNull(finalStats.wordsPerMessage.mine),
        theirWordsPerMessage: decimalOrNull(finalStats.wordsPerMessage.theirs),
        topWords: finalStats.topWords,
        topEmoji: finalStats.topEmoji,
        hourlyActivity: finalStats.hourlyActivity,
        dailyActivity: dailyActivityJson,
        weekdayActivity: finalStats.weekdayActivity,
        monthlyActivity: monthlyActivityJson,
        hourlyActivitySplit: finalStats.hourlyActivitySplit,
        topWordsBySender: finalStats.topWordsBySender,
        topEmojiBySender: finalStats.topEmojiBySender,
        uniqueWordsBySender: finalStats.uniqueWordsBySender,
        responseStats: finalStats.responseStats,
        messageComposition: finalStats.messageComposition,
        activityDistribution: finalStats.activityDistribution,
        compositionStats: finalStats.compositionStats,
        availabilityProfile: finalStats.availabilityProfile,
        healthScore: finalStats.healthScore,
        conversationFacts: finalStats.conversationFacts,
        wordsPerMessage: finalStats.wordsPerMessage,
        groupParticipants: finalStats.groupReport?.participants ?? [],
        groupTopPairs: finalStats.groupReport?.topPairs ?? [],
        groupHealth: finalStats.groupReport?.health ?? null,
        sharedVocabulary: finalStats.groupReport?.sharedVocabulary ?? [],
        uniqueGroupWords: finalStats.groupReport?.uniqueGroupWords ?? [],
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [schema.chatStats.userId, schema.chatStats.tgChatId],
        set: {
          chatName: params.chat.title,
          chatType: params.chat.type,
          totalMessages: finalStats.totalMessages,
          sentMessages: finalStats.sentMessages,
          receivedMessages: finalStats.receivedMessages,
          totalChars: finalStats.totalChars,
          totalWords: finalStats.totalWords,
          textMessageCount: finalStats.textMessageCount,
          mediaCount: finalStats.mediaCount,
          voiceCount: finalStats.voiceCount,
          stickerCount: finalStats.stickerCount,
          fileCount: finalStats.fileCount,
          firstMessageAt: finalStats.firstMessageAt,
          lastMessageAt: finalStats.lastMessageAt,
          averageMyResponseSec: finalStats.averageMyResponseSec,
          medianMyResponseSec: finalStats.medianMyResponseSec,
          medianTheirResponseSec: finalStats.medianTheirResponseSec,
          iWriteFirstPct: finalStats.iWriteFirstPct,
          responseRate: decimalOrNull(finalStats.responseRate),
          parsedAt: new Date(),
          myWordsPerMessage: decimalOrNull(finalStats.wordsPerMessage.mine),
          theirWordsPerMessage: decimalOrNull(finalStats.wordsPerMessage.theirs),
          topWords: finalStats.topWords,
          topEmoji: finalStats.topEmoji,
          hourlyActivity: finalStats.hourlyActivity,
          dailyActivity: dailyActivityJson,
          weekdayActivity: finalStats.weekdayActivity,
          monthlyActivity: monthlyActivityJson,
          hourlyActivitySplit: finalStats.hourlyActivitySplit,
          topWordsBySender: finalStats.topWordsBySender,
          topEmojiBySender: finalStats.topEmojiBySender,
          uniqueWordsBySender: finalStats.uniqueWordsBySender,
          responseStats: finalStats.responseStats,
          messageComposition: finalStats.messageComposition,
          activityDistribution: finalStats.activityDistribution,
          compositionStats: finalStats.compositionStats,
          availabilityProfile: finalStats.availabilityProfile,
          healthScore: finalStats.healthScore,
          conversationFacts: finalStats.conversationFacts,
          wordsPerMessage: finalStats.wordsPerMessage,
          groupParticipants: finalStats.groupReport?.participants ?? [],
          groupTopPairs: finalStats.groupReport?.topPairs ?? [],
          groupHealth: finalStats.groupReport?.health ?? null,
          sharedVocabulary: finalStats.groupReport?.sharedVocabulary ?? [],
          uniqueGroupWords: finalStats.groupReport?.uniqueGroupWords ?? [],
          updatedAt: new Date(),
        },
      })

    await recomputeGlobalStatsInTransaction(tx, params.userId)
  })
}

type StatsTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

async function recomputeGlobalStatsInTransaction(tx: StatsTransaction, userId: string) {
  const chats = await tx.query.chatStats.findMany({
    where: eq(schema.chatStats.userId, userId),
  })
  const dailyTotals = new Map<string, { sent: number; received: number }>()

  const totals = chats.reduce(
    (acc, chat) => {
      acc.totalChats += 1
      acc.totalMessages += chat.totalMessages
      acc.totalSent += chat.sentMessages
      acc.totalReceived += chat.receivedMessages
      acc.totalChars += chat.totalChars

      if (!acc.firstEverMessage || (chat.firstMessageAt && chat.firstMessageAt < acc.firstEverMessage)) {
        acc.firstEverMessage = chat.firstMessageAt
      }
      if (!acc.lastEverMessage || (chat.lastMessageAt && chat.lastMessageAt > acc.lastEverMessage)) {
        acc.lastEverMessage = chat.lastMessageAt
      }

      for (const item of chat.topWords as TopItemDto[]) {
        acc.words.set(item.value, (acc.words.get(item.value) ?? 0) + item.count)
      }
      for (const item of chat.topEmoji as TopItemDto[]) {
        acc.emoji.set(item.value, (acc.emoji.get(item.value) ?? 0) + item.count)
      }
      for (const [hour, count] of Object.entries(chat.hourlyActivity as Record<string, number>)) {
        acc.hours.set(hour, (acc.hours.get(hour) ?? 0) + count)
      }
      for (const item of chat.dailyActivity) {
        const current = dailyTotals.get(item.date) ?? { sent: 0, received: 0 }
        current.sent += item.sent
        current.received += item.received
        dailyTotals.set(item.date, current)
      }
      return acc
    },
    {
      totalChats: 0,
      totalMessages: 0,
      totalSent: 0,
      totalReceived: 0,
      totalChars: 0,
      firstEverMessage: null as Date | null,
      lastEverMessage: null as Date | null,
      words: new Map<string, number>(),
      emoji: new Map<string, number>(),
      hours: new Map<string, number>(),
    },
  )

  await tx.delete(schema.dailyActivity).where(eq(schema.dailyActivity.userId, userId))
  const dailyRows = Array.from(dailyTotals.entries()).map(([dateValue, counts]) => ({
    userId,
    date: dateValue,
    sent: counts.sent,
    received: counts.received,
  }))
  if (dailyRows.length) {
    await tx.insert(schema.dailyActivity).values(dailyRows)
  }

  const mostActiveHour = Array.from(totals.hours.entries()).sort((a, b) => b[1] - a[1])[0]?.[0]
  const dayOfWeekTotals = Array.from(dailyTotals.entries()).reduce((acc, [dateValue, counts]) => {
    const day = new Date(`${dateValue}T00:00:00`).getDay()
    acc.set(day, (acc.get(day) ?? 0) + counts.sent + counts.received)
    return acc
  }, new Map<number, number>())
  const mostActiveDay = Array.from(dayOfWeekTotals.entries()).sort((a, b) => b[1] - a[1])[0]?.[0]

  await tx
    .insert(schema.globalStats)
    .values({
      userId,
      totalChats: totals.totalChats,
      totalMessages: totals.totalMessages,
      totalSent: totals.totalSent,
      totalReceived: totals.totalReceived,
      totalChars: totals.totalChars,
      topWords: mapToTopItems(totals.words),
      topEmoji: mapToTopItems(totals.emoji),
      firstEverMsg: totals.firstEverMessage,
      lastEverMsg: totals.lastEverMessage,
      mostActiveHour: mostActiveHour ? Number(mostActiveHour) : null,
      mostActiveDay: mostActiveDay ?? null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [schema.globalStats.userId],
      set: {
        totalChats: totals.totalChats,
        totalMessages: totals.totalMessages,
        totalSent: totals.totalSent,
        totalReceived: totals.totalReceived,
        totalChars: totals.totalChars,
        topWords: mapToTopItems(totals.words),
        topEmoji: mapToTopItems(totals.emoji),
        firstEverMsg: totals.firstEverMessage,
        lastEverMsg: totals.lastEverMessage,
        mostActiveHour: mostActiveHour ? Number(mostActiveHour) : null,
        mostActiveDay: mostActiveDay ?? null,
        updatedAt: new Date(),
      },
    })
}

export async function recomputeGlobalStats(userId: string) {
  await db.transaction(async (tx) => {
    const lockedUser = await tx.execute(sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`)
    if (lockedUser.rowCount !== 1) {
      throw new Error('User no longer exists')
    }
    await recomputeGlobalStatsInTransaction(tx, userId)
  })
}

export async function deleteChatReport(userId: string, chatId: string) {
  const parsedChatId = Number(chatId)
  if (!Number.isFinite(parsedChatId)) {
    return false
  }

  return db.transaction(async (tx) => {
    const lockedUser = await tx.execute(sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`)
    if (lockedUser.rowCount !== 1) {
      return false
    }

    const deleted = await tx
      .delete(schema.chatStats)
      .where(and(eq(schema.chatStats.userId, userId), eq(schema.chatStats.tgChatId, parsedChatId)))
      .returning({ id: schema.chatStats.id })

    if (!deleted.length) {
      return false
    }

    await recomputeGlobalStatsInTransaction(tx, userId)
    return true
  })
}

export async function getGlobalStats(userId: string): Promise<GlobalStatsDto> {
  const row = await db.query.globalStats.findFirst({
    where: eq(schema.globalStats.userId, userId),
  })

  if (!row) {
    return {
      totalChats: 0,
      totalMessages: 0,
      totalSent: 0,
      totalReceived: 0,
      totalChars: 0,
      topEmoji: [],
      topWords: [],
      firstEverMessage: null,
      lastEverMessage: null,
      mostActiveHour: null,
      mostActiveDay: null,
    }
  }

  return {
    totalChats: row.totalChats,
    totalMessages: row.totalMessages,
    totalSent: row.totalSent,
    totalReceived: row.totalReceived,
    totalChars: row.totalChars,
    topEmoji: row.topEmoji as TopItemDto[],
    topWords: row.topWords as TopItemDto[],
    firstEverMessage: row.firstEverMsg?.toISOString() ?? null,
    lastEverMessage: row.lastEverMsg?.toISOString() ?? null,
    mostActiveHour: row.mostActiveHour,
    mostActiveDay: row.mostActiveDay,
  }
}

export async function getChats(userId: string, page: number, limit: number, sort: string, order: 'asc' | 'desc') {
  const sortColumn =
    {
      total_messages: schema.chatStats.totalMessages,
      sent_messages: schema.chatStats.sentMessages,
      received_messages: schema.chatStats.receivedMessages,
      last_message_at: schema.chatStats.lastMessageAt,
      first_message_at: schema.chatStats.firstMessageAt,
      chat_name: schema.chatStats.chatName,
      parsed_at: schema.chatStats.parsedAt,
    }[sort] ?? schema.chatStats.totalMessages

  const rows = await db.query.chatStats.findMany({
    where: eq(schema.chatStats.userId, userId),
    limit,
    offset: (page - 1) * limit,
    orderBy: [order === 'asc' ? asc(sortColumn) : desc(sortColumn)],
  })
  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.chatStats)
    .where(eq(schema.chatStats.userId, userId))

  return {
    chats: rows.map(toChatDto),
    total: Number(countRow?.count ?? 0),
    page,
    limit,
  }
}

export async function getChat(userId: string, chatId: string) {
  const row = await db.query.chatStats.findFirst({
    where: and(eq(schema.chatStats.userId, userId), eq(schema.chatStats.tgChatId, Number(chatId))),
  })
  return row ? toChatDto(row) : null
}

export async function getActivity(userId: string, from?: string, to?: string) {
  const filters = [eq(schema.dailyActivity.userId, userId)]
  if (from) {
    filters.push(gte(schema.dailyActivity.date, from))
  }
  if (to) {
    filters.push(lte(schema.dailyActivity.date, to))
  }

  const rows = await db.query.dailyActivity.findMany({
    where: and(...filters),
    orderBy: [asc(schema.dailyActivity.date)],
  })

  return {
    daily: rows.map((item) => ({
      date: item.date,
      sent: item.sent,
      received: item.received,
    })),
  }
}

export async function getTop(userId: string, type: string, limit = 10) {
  if (type === 'chats') {
    const result = await db.query.chatStats.findMany({
      where: eq(schema.chatStats.userId, userId),
      orderBy: [desc(schema.chatStats.totalMessages)],
      limit,
    })
    return {
      items: result.map((item) => ({ value: item.chatName ?? String(item.tgChatId), count: item.totalMessages })),
    }
  }

  const stats = await getGlobalStats(userId)
  return {
    items: (type === 'emoji' ? stats.topEmoji : stats.topWords).slice(0, limit),
  }
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
  const value = row.activityDistribution ?? null
  if (value?.night && value?.morning && value?.afternoon && value?.evening) {
    return value
  }

  return computeActivityDistribution(row.hourlyActivitySplit as Record<string, DirectionalCountDto>)
}

function resolveCompositionStats(
  row: typeof schema.chatStats.$inferSelect,
  messageComposition: MessageCompositionDto,
  textMessageCount: number,
): CompositionStatsDto {
  const value = row.compositionStats ?? null
  if (value) {
    return {
      textSharePct: value.textSharePct ?? null,
      mediaSharePct: value.mediaSharePct ?? null,
      voiceSharePct: value.voiceSharePct ?? null,
      stickerSharePct: value.stickerSharePct ?? null,
      fileSharePct: value.fileSharePct ?? null,
      avgCharsPerTextMessage: value.avgCharsPerTextMessage ?? null,
    }
  }

  return computeCompositionStats({
    totalMessages: row.totalMessages ?? 0,
    totalChars: row.totalChars ?? 0,
    textMessageCount,
    messageComposition,
  })
}

function resolveAvailabilityProfile(row: typeof schema.chatStats.$inferSelect): AvailabilityProfileDto {
  const value = row.availabilityProfile ?? null
  if (value) {
    return {
      activeHours: value.activeHours ?? 0,
      activeHoursPct: value.activeHoursPct ?? 0,
      concentrationIndex: value.concentrationIndex ?? null,
      predictability: value.predictability ?? 'low',
      peakWindow: value.peakWindow ?? null,
      secondaryWindow: value.secondaryWindow ?? null,
    }
  }

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

function toChatDto(row: typeof schema.chatStats.$inferSelect): ChatStatsDto {
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

function decimalOrNull(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return null
  }
  return value.toFixed(2)
}

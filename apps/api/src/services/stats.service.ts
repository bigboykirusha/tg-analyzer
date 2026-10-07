import type { GlobalStatsDto, TopItemDto } from '@tg-analyzer/shared'
import {
  createChatAccumulator,
  finalizeAccumulator,
  mapDailyActivity,
  mapMonthlyActivity,
  mapToTopItems,
} from '@tg-analyzer/shared'
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { db, schema } from '../db'
import { toChatDto } from './chat-stats.mapper'

export { aggregateMessage, createChatAccumulator, finalizeAccumulator } from '@tg-analyzer/shared'
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

function decimalOrNull(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return null
  }
  return value.toFixed(2)
}

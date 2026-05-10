import type {
  ChatStatsDto,
  ConversationFactsDto,
  DirectionalCountDto,
  DirectionalTopItemsDto,
  GlobalStatsDto,
  MessageCompositionDto,
  MonthlyActivityDto,
  ResponseStatsDto,
  TopItemDto,
} from '@tg-analyzer/shared'
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { db, schema } from '../db'

const emojiRegex = /\p{Extended_Pictographic}/gu
const wordRegex = /[\p{L}\p{N}_-]{2,}/gu
const SESSION_BOUNDARY_MS = 8 * 60 * 60 * 1000
const LONG_SILENCE_MS = 30 * 24 * 60 * 60 * 1000
const STOP_WORDS_RU = new Set([
  'и', 'в', 'не', 'на', 'я', 'что', 'тот', 'это', 'с', 'он',
  'как', 'по', 'но', 'они', 'к', 'из', 'у', 'за', 'то', 'же',
  'от', 'так', 'а', 'да', 'ну', 'вот', 'уже', 'ещё', 'бы', 'ли',
  'до', 'со', 'мне', 'ты', 'мы', 'вы', 'она', 'оно', 'об', 'её',
  'его', 'их', 'ей', 'им', 'нас', 'вас', 'нет', 'был', 'была',
  'были', 'быть', 'есть', 'буду', 'всё', 'все', 'или', 'если',
  'когда', 'чтобы', 'потому', 'этот', 'эта', 'эти', 'при', 'без',
  'под', 'над', 'для', 'про', 'меня', 'тебя', 'него', 'неё', 'них',
  'себя', 'там', 'тут', 'где', 'куда', 'мой', 'твой', 'свой',
  'наш', 'ваш', 'чем', 'можно', 'надо', 'нужно', 'только', 'вообще',
  'просто', 'очень', 'тоже', 'зато', 'хотя', 'пока', 'потом',
  'после', 'перед', 'между', 'через', 'здесь', 'туда', 'оттуда',
  'ведь', 'даже', 'лишь', 'именно', 'разве', 'неужели', 'вдруг',
])
const STOP_WORDS_EN = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'you', 'your', 'he', 'him',
  'his', 'she', 'her', 'it', 'its', 'they', 'them', 'their', 'what',
  'which', 'who', 'this', 'that', 'these', 'those', 'am', 'is', 'are',
  'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do',
  'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
  'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
  'for', 'on', 'with', 'at', 'by', 'from', 'as', 'an', 'the', 'and',
  'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'not', 'no',
  'if', 'then', 'than', 'too', 'very', 'just', 'because', 'while',
  'although', 'though', 'since', 'until', 'unless', 'also', 'about',
  'up', 'out', 'into', 'over', 'after', 'before', 'between', 'through',
  'ok', 'okay', 'yes', 'yeah', 'yep', 'nope', 'hey', 'hi',
])
const stopWords = new Set([...STOP_WORDS_RU, ...STOP_WORDS_EN])

export interface AggregatedChatStats {
  totalMessages: number
  sentMessages: number
  receivedMessages: number
  totalChars: number
  totalWords: number
  textMessageCount: number
  mediaCount: number
  voiceCount: number
  stickerCount: number
  fileCount: number
  firstMessageAt: Date | null
  lastMessageAt: Date | null
  topWords: TopItemDto[]
  topEmoji: TopItemDto[]
  hourlyActivity: Record<string, number>
  dailyActivity: Map<string, { sent: number; received: number }>
  weekdayActivity: Record<string, DirectionalCountDto>
  monthlyActivity: Map<string, DirectionalCountDto>
  hourlyActivitySplit: Record<string, DirectionalCountDto>
  topWordsBySender: DirectionalTopItemsDto
  topEmojiBySender: DirectionalTopItemsDto
  uniqueWordsBySender: DirectionalTopItemsDto
  responseStats: ResponseStatsDto
  messageComposition: MessageCompositionDto
  conversationFacts: ConversationFactsDto
  wordsPerMessage: { mine: number | null; theirs: number | null }
  avgResponseSec: number | null
  medianMyResponseSec: number | null
  medianTheirResponseSec: number | null
  iWriteFirstPct: number | null
}

export interface AggregationMessageInput {
  message?: string
  date?: Date
  outgoing?: boolean
  media?: boolean
  voice?: boolean
  sticker?: boolean
  file?: boolean
}

export function createChatAccumulator(): AggregatedChatStats & {
  wordCounts: Map<string, number>
  mineWordCounts: Map<string, number>
  theirsWordCounts: Map<string, number>
  emojiCounts: Map<string, number>
  mineEmojiCounts: Map<string, number>
  theirsEmojiCounts: Map<string, number>
  dayFirstMessageDirection: Map<string, boolean>
  timeline: Array<{ outgoing: boolean; timestamp: Date }>
  mineWords: number
  theirsWords: number
  mineTextMessages: number
  theirsTextMessages: number
} {
  return {
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
    topWords: [],
    topEmoji: [],
    hourlyActivity: Object.fromEntries(Array.from({ length: 24 }, (_, index) => [String(index), 0])),
    dailyActivity: new Map(),
    weekdayActivity: Object.fromEntries(Array.from({ length: 7 }, (_, index) => [String(index), createDirectionalCount()])),
    monthlyActivity: new Map(),
    hourlyActivitySplit: Object.fromEntries(Array.from({ length: 24 }, (_, index) => [String(index), createDirectionalCount()])),
    topWordsBySender: { mine: [], theirs: [] },
    topEmojiBySender: { mine: [], theirs: [] },
    uniqueWordsBySender: { mine: [], theirs: [] },
    responseStats: { medianMineSec: null, medianTheirsSec: null, mineSamples: 0, theirsSamples: 0 },
    messageComposition: { text: 0, media: 0, voice: 0, sticker: 0, file: 0 },
    conversationFacts: {
      activeDays: 0,
      longestGap: null,
      mostActiveDate: null,
      maxStreakDays: 0,
      firstMessageAt: null,
      silencePeriodsOver30Days: [],
      trend: 'unknown',
      mostActiveMonth: null,
    },
    wordsPerMessage: { mine: null, theirs: null },
    avgResponseSec: null,
    medianMyResponseSec: null,
    medianTheirResponseSec: null,
    iWriteFirstPct: null,
    wordCounts: new Map(),
    mineWordCounts: new Map(),
    theirsWordCounts: new Map(),
    emojiCounts: new Map(),
    mineEmojiCounts: new Map(),
    theirsEmojiCounts: new Map(),
    dayFirstMessageDirection: new Map(),
    timeline: [],
    mineWords: 0,
    theirsWords: 0,
    mineTextMessages: 0,
    theirsTextMessages: 0,
  }
}

function createDirectionalCount(): DirectionalCountDto {
  return { sent: 0, received: 0, total: 0 }
}

function incrementDirectional(count: DirectionalCountDto, outgoing: boolean) {
  count.total += 1
  if (outgoing) {
    count.sent += 1
  } else {
    count.received += 1
  }
}

function padNumber(value: number) {
  return String(value).padStart(2, '0')
}

function toLocalDayKey(date: Date) {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`
}

function toLocalMonthKey(date: Date) {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}`
}

function primaryMessageType(message: AggregationMessageInput): keyof MessageCompositionDto {
  if (message.voice) {
    return 'voice'
  }
  if (message.sticker) {
    return 'sticker'
  }
  if (message.file) {
    return 'file'
  }
  if (message.media) {
    return 'media'
  }
  return 'text'
}

export function aggregateMessage(
  message: AggregationMessageInput,
  acc: ReturnType<typeof createChatAccumulator>,
) {
  acc.totalMessages += 1
  if (message.outgoing) {
    acc.sentMessages += 1
  } else {
    acc.receivedMessages += 1
  }

  const timestamp = normalizeMessageDate(message.date) ?? new Date()
  const hour = String(timestamp.getHours())
  acc.hourlyActivity[hour] = (acc.hourlyActivity[hour] ?? 0) + 1
  incrementDirectional(acc.hourlyActivitySplit[hour] ?? createDirectionalCount(), Boolean(message.outgoing))
  acc.hourlyActivitySplit[hour] = acc.hourlyActivitySplit[hour] ?? createDirectionalCount()

  const day = toLocalDayKey(timestamp)
  const daily = acc.dailyActivity.get(day) ?? { sent: 0, received: 0 }
  if (!acc.dayFirstMessageDirection.has(day)) {
    acc.dayFirstMessageDirection.set(day, Boolean(message.outgoing))
  }
  if (message.outgoing) {
    daily.sent += 1
  } else {
    daily.received += 1
  }
  acc.dailyActivity.set(day, daily)

  const weekday = String(timestamp.getDay())
  incrementDirectional(acc.weekdayActivity[weekday], Boolean(message.outgoing))

  const month = toLocalMonthKey(timestamp)
  const monthly = acc.monthlyActivity.get(month) ?? createDirectionalCount()
  incrementDirectional(monthly, Boolean(message.outgoing))
  acc.monthlyActivity.set(month, monthly)

  if (!acc.firstMessageAt || timestamp < acc.firstMessageAt) {
    acc.firstMessageAt = timestamp
  }
  if (!acc.lastMessageAt || timestamp > acc.lastMessageAt) {
    acc.lastMessageAt = timestamp
  }

  acc.timeline.push({ outgoing: Boolean(message.outgoing), timestamp })

  const text = message.message ?? ''
  acc.totalChars += text.length
  const messageType = primaryMessageType(message)
  acc.messageComposition[messageType] += 1
  if (messageType === 'text') {
    acc.textMessageCount += 1
    if (message.outgoing) {
      acc.mineTextMessages += 1
    } else {
      acc.theirsTextMessages += 1
    }
  }

  const words = text.match(wordRegex) ?? []
  acc.totalWords += words.length
  if (message.outgoing) {
    acc.mineWords += words.length
  } else {
    acc.theirsWords += words.length
  }
  for (const word of words) {
    const normalized = word.toLowerCase()
    if (stopWords.has(normalized)) {
      continue
    }
    acc.wordCounts.set(normalized, (acc.wordCounts.get(normalized) ?? 0) + 1)
    const directionalWords = message.outgoing ? acc.mineWordCounts : acc.theirsWordCounts
    directionalWords.set(normalized, (directionalWords.get(normalized) ?? 0) + 1)
  }

  const emoji = text.match(emojiRegex) ?? []
  for (const item of emoji) {
    acc.emojiCounts.set(item, (acc.emojiCounts.get(item) ?? 0) + 1)
    const directionalEmoji = message.outgoing ? acc.mineEmojiCounts : acc.theirsEmojiCounts
    directionalEmoji.set(item, (directionalEmoji.get(item) ?? 0) + 1)
  }

  acc.mediaCount += Number(messageType === 'media')
  acc.voiceCount += Number(messageType === 'voice')
  acc.stickerCount += Number(messageType === 'sticker')
  acc.fileCount += Number(messageType === 'file')
}

export function projectTelegramMessageMetadata(message: any): AggregationMessageInput {
  return {
    message: typeof message?.message === 'string' ? message.message : '',
    date: normalizeMessageDate(message?.date),
    outgoing: Boolean(message?.outgoing ?? message?.out),
    media: Boolean(message?.media),
    voice: Boolean(message?.voice),
    sticker: Boolean(message?.sticker),
    file: Boolean(message?.file),
  }
}

function normalizeMessageDate(value: unknown): Date | undefined {
  if (!value) {
    return undefined
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : new Date(value)
  }

  if (typeof value === 'number') {
    const timestamp = value < 1e12 ? value * 1000 : value
    const date = new Date(timestamp)
    return Number.isNaN(date.getTime()) ? undefined : date
  }

  if (typeof value === 'string') {
    const numeric = Number(value)
    if (!Number.isNaN(numeric) && value.trim() !== '') {
      return normalizeMessageDate(numeric)
    }
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? undefined : date
  }

  if (typeof value === 'object' && value !== null && 'valueOf' in value && typeof value.valueOf === 'function') {
    const resolved = value.valueOf()
    if (resolved !== value) {
      return normalizeMessageDate(resolved)
    }
  }

  return undefined
}

export function finalizeAccumulator(acc: ReturnType<typeof createChatAccumulator>, chatType?: string | null) {
  acc.topWords = mapToTopItems(acc.wordCounts)
  acc.topEmoji = mapToTopItems(acc.emojiCounts)
  acc.topWordsBySender = {
    mine: mapToTopItems(acc.mineWordCounts),
    theirs: mapToTopItems(acc.theirsWordCounts),
  }
  acc.topEmojiBySender = {
    mine: mapToTopItems(acc.mineEmojiCounts),
    theirs: mapToTopItems(acc.theirsEmojiCounts),
  }
  acc.uniqueWordsBySender = {
    mine: uniqueTopItems(acc.mineWordCounts, acc.theirsWordCounts),
    theirs: uniqueTopItems(acc.theirsWordCounts, acc.mineWordCounts),
  }
  acc.wordsPerMessage = {
    mine: acc.mineTextMessages ? Number((acc.mineWords / acc.mineTextMessages).toFixed(2)) : null,
    theirs: acc.theirsTextMessages ? Number((acc.theirsWords / acc.theirsTextMessages).toFixed(2)) : null,
  }

  const privateLike = chatType === 'private'
  const timeline = [...acc.timeline].sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime())
  const mineResponseSeconds: number[] = []
  const theirsResponseSeconds: number[] = []
  let longestGap: ConversationFactsDto['longestGap'] = null
  const silencePeriodsOver30Days: NonNullable<ConversationFactsDto['silencePeriodsOver30Days']> = []
  const sessionStarts: boolean[] = []

  for (let index = 0; index < timeline.length; index += 1) {
    const current = timeline[index]
    const previous = timeline[index - 1]
    if (!previous) {
      sessionStarts.push(current.outgoing)
      continue
    }

    const gapMs = current.timestamp.getTime() - previous.timestamp.getTime()
    const gap = {
      seconds: Math.round(gapMs / 1000),
      from: previous.timestamp.toISOString(),
      to: current.timestamp.toISOString(),
    }
    if (!longestGap || gap.seconds > longestGap.seconds) {
      longestGap = gap
    }
    if (gapMs > LONG_SILENCE_MS) {
      silencePeriodsOver30Days.push(gap)
    }
    if (gapMs > SESSION_BOUNDARY_MS) {
      sessionStarts.push(current.outgoing)
    }
    if (privateLike && previous.outgoing !== current.outgoing && gapMs >= 0 && gapMs <= SESSION_BOUNDARY_MS) {
      if (current.outgoing) {
        mineResponseSeconds.push(gap.seconds)
      } else {
        theirsResponseSeconds.push(gap.seconds)
      }
    }
  }

  if (privateLike) {
    const averageMineSec = mineResponseSeconds.length
      ? Math.round(mineResponseSeconds.reduce((sum, value) => sum + value, 0) / mineResponseSeconds.length)
      : null
    const medianMineSec = median(mineResponseSeconds)
    const medianTheirsSec = median(theirsResponseSeconds)
    acc.responseStats = {
      medianMineSec,
      medianTheirsSec,
      mineSamples: mineResponseSeconds.length,
      theirsSamples: theirsResponseSeconds.length,
    }
    acc.avgResponseSec = averageMineSec
    acc.medianMyResponseSec = medianMineSec
    acc.medianTheirResponseSec = medianTheirsSec

    if (sessionStarts.length > 0) {
      const outgoingStarts = sessionStarts.filter(Boolean).length
      acc.iWriteFirstPct = Math.round((outgoingStarts / sessionStarts.length) * 100)
    }
  } else {
    acc.responseStats = { medianMineSec: null, medianTheirsSec: null, mineSamples: 0, theirsSamples: 0 }
    acc.avgResponseSec = null
    acc.medianMyResponseSec = null
    acc.medianTheirResponseSec = null
    acc.iWriteFirstPct = null
  }

  const dailyRows = mapDailyActivity(acc.dailyActivity)
  const mostActiveDate = dailyRows.length
    ? [...dailyRows].sort((left, right) => right.total - left.total)[0]
    : null
  const monthlyRows = mapMonthlyActivity(acc.monthlyActivity)
  const mostActiveMonth = monthlyRows.length
    ? [...monthlyRows].sort((left, right) => right.total - left.total)[0]?.month ?? null
    : null
  acc.conversationFacts = {
    activeDays: dailyRows.length,
    longestGap,
    mostActiveDate: mostActiveDate ? { date: mostActiveDate.date, total: mostActiveDate.total } : null,
    maxStreakDays: computeMaxStreak(Array.from(acc.dailyActivity.keys())),
    firstMessageAt: acc.firstMessageAt?.toISOString() ?? null,
    silencePeriodsOver30Days: silencePeriodsOver30Days.sort((left, right) => right.seconds - left.seconds).slice(0, 8),
    trend: computeTrend(monthlyRows),
    mostActiveMonth,
  }

  return acc
}

export function mapToTopItems(map: Map<string, number>, limit = 20): TopItemDto[] {
  return Array.from(map.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }))
}

function uniqueTopItems(source: Map<string, number>, other: Map<string, number>, limit = 20): TopItemDto[] {
  return mapToTopItems(new Map(Array.from(source.entries()).filter(([word]) => !other.has(word))), limit)
}

function median(values: number[]) {
  if (!values.length) {
    return null
  }
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2)
}

function mapDailyActivity(map: Map<string, { sent: number; received: number }>) {
  return Array.from(map.entries())
    .map(([date, counts]) => ({
      date,
      sent: counts.sent,
      received: counts.received,
      total: counts.sent + counts.received,
    }))
    .sort((left, right) => left.date.localeCompare(right.date))
}

function mapMonthlyActivity(map: Map<string, DirectionalCountDto>): MonthlyActivityDto[] {
  return Array.from(map.entries())
    .map(([month, counts]) => ({ month, ...counts }))
    .sort((left, right) => left.month.localeCompare(right.month))
}

function computeMaxStreak(days: string[]) {
  const sorted = [...new Set(days)].sort()
  let max = 0
  let current = 0
  let previousTime = 0

  for (const day of sorted) {
    const time = new Date(`${day}T00:00:00`).getTime()
    if (!previousTime || time - previousTime === 24 * 60 * 60 * 1000) {
      current += 1
    } else {
      current = 1
    }
    max = Math.max(max, current)
    previousTime = time
  }

  return max
}

function computeTrend(months: MonthlyActivityDto[]): ConversationFactsDto['trend'] {
  if (months.length < 6) {
    return 'unknown'
  }
  const lastThree = months.slice(-3).reduce((sum, item) => sum + item.total, 0)
  const previousThree = months.slice(-6, -3).reduce((sum, item) => sum + item.total, 0)
  if (!previousThree && !lastThree) {
    return 'unknown'
  }
  if (lastThree > previousThree * 1.15) {
    return 'growing'
  }
  if (lastThree < previousThree * 0.85) {
    return 'fading'
  }
  return 'stable'
}

export async function saveAggregates(params: {
  userId: string
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
  await db
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
      avgResponseSec: finalStats.avgResponseSec,
      medianMyResponseSec: finalStats.medianMyResponseSec,
      medianTheirResponseSec: finalStats.medianTheirResponseSec,
      iWriteFirstPct: finalStats.iWriteFirstPct,
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
      conversationFacts: finalStats.conversationFacts,
      wordsPerMessage: finalStats.wordsPerMessage,
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
        avgResponseSec: finalStats.avgResponseSec,
        medianMyResponseSec: finalStats.medianMyResponseSec,
        medianTheirResponseSec: finalStats.medianTheirResponseSec,
        iWriteFirstPct: finalStats.iWriteFirstPct,
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
        conversationFacts: finalStats.conversationFacts,
        wordsPerMessage: finalStats.wordsPerMessage,
        updatedAt: new Date(),
      },
    })

  await recomputeGlobalStats(params.userId)
}

export async function recomputeGlobalStats(userId: string) {
  const chats = await db.query.chatStats.findMany({
    where: eq(schema.chatStats.userId, userId),
  })
  const dailyTotals = new Map<string, { sent: number; received: number }>()

  const totals = chats.reduce((acc, chat) => {
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
  }, {
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
  })

  await db.delete(schema.dailyActivity).where(eq(schema.dailyActivity.userId, userId))
  for (const [dateValue, counts] of dailyTotals.entries()) {
    await db.insert(schema.dailyActivity).values({
      userId,
      date: dateValue,
      sent: counts.sent,
      received: counts.received,
    })
  }

  const mostActiveHour = Array.from(totals.hours.entries()).sort((a, b) => b[1] - a[1])[0]?.[0]
  const dayOfWeekTotals = Array.from(dailyTotals.entries()).reduce((acc, [dateValue, counts]) => {
    const day = new Date(`${dateValue}T00:00:00`).getDay()
    acc.set(day, (acc.get(day) ?? 0) + counts.sent + counts.received)
    return acc
  }, new Map<number, number>())
  const mostActiveDay = Array.from(dayOfWeekTotals.entries()).sort((a, b) => b[1] - a[1])[0]?.[0]

  await db
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

export async function deleteChatReport(userId: string, chatId: string) {
  const parsedChatId = Number(chatId)
  if (!Number.isFinite(parsedChatId)) {
    return false
  }

  const deleted = await db
    .delete(schema.chatStats)
    .where(and(eq(schema.chatStats.userId, userId), eq(schema.chatStats.tgChatId, parsedChatId)))
    .returning({ id: schema.chatStats.id })

  if (!deleted.length) {
    return false
  }

  await recomputeGlobalStats(userId)
  return true
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
  const sortColumn = {
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
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(schema.chatStats).where(eq(schema.chatStats.userId, userId))

  return {
    chats: rows.map(toChatDto),
    total: Number(count),
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
    return { items: result.map((item) => ({ value: item.chatName ?? String(item.tgChatId), count: item.totalMessages })) }
  }

  const stats = await getGlobalStats(userId)
  return {
    items: (type === 'emoji' ? stats.topEmoji : stats.topWords).slice(0, limit),
  }
}

function toChatDto(row: typeof schema.chatStats.$inferSelect): ChatStatsDto {
  const legacyTextMessageCount = Math.max(
    (row.totalMessages ?? 0)
      - (row.mediaCount ?? 0)
      - (row.voiceCount ?? 0)
      - (row.stickerCount ?? 0)
      - (row.fileCount ?? 0),
    0,
  )
  const storedComposition = row.messageComposition ?? null
  const storedCompositionTotal = storedComposition
    ? storedComposition.text + storedComposition.media + storedComposition.voice + storedComposition.sticker + storedComposition.file
    : 0

  return {
    tgChatId: String(row.tgChatId),
    chatName: row.chatName,
    chatType: row.chatType,
    totalMessages: row.totalMessages,
    sentMessages: row.sentMessages,
    receivedMessages: row.receivedMessages,
    totalChars: row.totalChars,
    totalWords: row.totalWords,
    textMessageCount: (row.textMessageCount ?? 0) > 0 ? row.textMessageCount : legacyTextMessageCount,
    mediaCount: row.mediaCount,
    voiceCount: row.voiceCount,
    stickerCount: row.stickerCount,
    fileCount: row.fileCount,
    firstMessageAt: row.firstMessageAt?.toISOString() ?? null,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    parsedAt: row.parsedAt?.toISOString() ?? null,
    avgResponseSec: row.avgResponseSec,
    medianMyResponseSec: row.medianMyResponseSec ?? row.avgResponseSec,
    medianTheirResponseSec: row.medianTheirResponseSec,
    myWordsPerMessage: numberOrNull(row.myWordsPerMessage),
    theirWordsPerMessage: numberOrNull(row.theirWordsPerMessage),
    iWriteFirstPct: row.iWriteFirstPct,
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
    responseStats: row.responseStats,
    messageComposition: storedComposition && storedCompositionTotal > 0
      ? storedComposition
      : {
          text: (row.textMessageCount ?? 0) > 0 ? row.textMessageCount : legacyTextMessageCount,
          media: row.mediaCount ?? 0,
          voice: row.voiceCount ?? 0,
          sticker: row.stickerCount ?? 0,
          file: row.fileCount ?? 0,
        },
    conversationFacts: row.conversationFacts,
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

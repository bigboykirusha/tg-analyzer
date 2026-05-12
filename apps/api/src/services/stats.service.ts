import type {
  ChatStatsDto,
  ConversationFactsDto,
  DirectionalCountDto,
  DirectionalTopItemsDto,
  GlobalStatsDto,
  InsightDto,
  MessageCompositionDto,
  MonthlyActivityDto,
  RelationshipScoreDto,
  ResponseStatsDto,
  SessionStatsDto,
  TopItemDto,
} from '@tg-analyzer/shared'
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { db, schema } from '../db'
import type { TelegramMessageLike } from './telegram.service'

const emojiRegex = /\p{Extended_Pictographic}/gu
const wordRegex = /[\p{L}\p{N}_-]{2,}/gu
const SESSION_BOUNDARY_MS = 8 * 60 * 60 * 1000
const LONG_SILENCE_MS = 30 * 24 * 60 * 60 * 1000
const STOP_WORDS_RU = new Set([
  '\u0438', '\u0432', '\u043d\u0435', '\u043d\u0430', '\u044f', '\u0447\u0442\u043e', '\u0442\u043e\u0442', '\u044d\u0442\u043e', '\u0441', '\u043e\u043d',
  '\u043a\u0430\u043a', '\u043f\u043e', '\u043d\u043e', '\u043e\u043d\u0438', '\u043a', '\u0438\u0437', '\u0443', '\u0437\u0430', '\u0442\u043e', '\u0436\u0435',
  '\u043e\u0442', '\u0442\u0430\u043a', '\u0430', '\u0434\u0430', '\u043d\u0443', '\u0432\u043e\u0442', '\u0443\u0436\u0435', '\u0435\u0449\u0451', '\u0435\u0449\u0435', '\u0431\u044b',
  '\u043b\u0438', '\u0434\u043e', '\u0441\u043e', '\u043c\u043d\u0435', '\u0442\u044b', '\u043c\u044b', '\u0432\u044b', '\u043e\u043d\u0430', '\u043e\u043d\u043e', '\u043e\u0431',
  '\u0435\u0451', '\u0435\u0435', '\u0435\u0433\u043e', '\u0438\u0445', '\u0435\u0439', '\u0438\u043c', '\u043d\u0430\u0441', '\u0432\u0430\u0441', '\u043d\u0435\u0442', '\u0431\u044b\u043b',
  '\u0431\u044b\u043b\u0430', '\u0431\u044b\u043b\u0438', '\u0431\u044b\u0442\u044c', '\u0435\u0441\u0442\u044c', '\u0431\u0443\u0434\u0443', '\u0432\u0441\u0451', '\u0432\u0441\u0435', '\u0438\u043b\u0438', '\u0435\u0441\u043b\u0438', '\u043a\u043e\u0433\u0434\u0430',
  '\u0447\u0442\u043e\u0431\u044b', '\u043f\u043e\u0442\u043e\u043c\u0443', '\u044d\u0442\u043e\u0442', '\u044d\u0442\u0430', '\u044d\u0442\u0438', '\u043f\u0440\u0438', '\u0431\u0435\u0437', '\u043f\u043e\u0434', '\u043d\u0430\u0434', '\u0434\u043b\u044f',
  '\u043f\u0440\u043e', '\u043c\u0435\u043d\u044f', '\u0442\u0435\u0431\u044f', '\u043d\u0435\u0433\u043e', '\u043d\u0435\u0451', '\u043d\u0435\u0435', '\u043d\u0438\u0445', '\u0441\u0435\u0431\u044f', '\u0442\u0430\u043c', '\u0442\u0443\u0442',
  '\u0433\u0434\u0435', '\u043a\u0443\u0434\u0430', '\u043c\u043e\u0439', '\u0442\u0432\u043e\u0439', '\u0441\u0432\u043e\u0439', '\u043d\u0430\u0448', '\u0432\u0430\u0448', '\u0447\u0435\u043c', '\u043c\u043e\u0436\u043d\u043e', '\u043d\u0430\u0434\u043e',
  '\u043d\u0443\u0436\u043d\u043e', '\u0442\u043e\u043b\u044c\u043a\u043e', '\u0432\u043e\u043e\u0431\u0449\u0435', '\u043f\u0440\u043e\u0441\u0442\u043e', '\u043e\u0447\u0435\u043d\u044c', '\u0442\u043e\u0436\u0435', '\u0437\u0430\u0442\u043e', '\u0445\u043e\u0442\u044f', '\u043f\u043e\u043a\u0430', '\u043f\u043e\u0442\u043e\u043c',
  '\u043f\u043e\u0441\u043b\u0435', '\u043f\u0435\u0440\u0435\u0434', '\u043c\u0435\u0436\u0434\u0443', '\u0447\u0435\u0440\u0435\u0437', '\u0437\u0434\u0435\u0441\u044c', '\u0442\u0443\u0434\u0430', '\u043e\u0442\u0442\u0443\u0434\u0430', '\u0432\u0435\u0434\u044c', '\u0434\u0430\u0436\u0435', '\u043b\u0438\u0448\u044c',
  '\u0438\u043c\u0435\u043d\u043d\u043e', '\u0440\u0430\u0437\u0432\u0435', '\u043d\u0435\u0443\u0436\u0435\u043b\u0438', '\u0432\u0434\u0440\u0443\u0433',
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
      sessionStats: createEmptySessionStats(),
      relationshipScore: null,
      insights: [],
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

function createEmptySessionStats(): SessionStatsDto {
  return {
    totalSessions: 0,
    averageSessionMessages: 0,
    averageSessionDurationSec: null,
    longestSessionMessages: 0,
    longestSessionDurationSec: null,
    sessionsPerActiveWeek: 0,
    nightSessionsPct: null,
    highlights: [],
  }
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

function normalizeWordToken(word: string) {
  const normalized = word
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')

  if (!normalized || normalized.length < 2) {
    return null
  }

  const lettersOnly = normalized.replace(/[\p{N}_-]/gu, '')
  if (lettersOnly.length < 2) {
    return null
  }

  return normalized
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
    const normalized = normalizeWordToken(word)
    if (!normalized) {
      continue
    }
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

export function projectTelegramMessageMetadata(message: TelegramMessageLike): AggregationMessageInput {
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
  const activeDays = dailyRows.length
  const maxStreakDays = computeMaxStreak(Array.from(acc.dailyActivity.keys()))
  const trend = computeTrend(monthlyRows)
  const sessionStats = buildSessionStats(timeline, activeDays)
  const relationshipScore = computeRelationshipScore({
    privateLike,
    sentMessages: acc.sentMessages,
    receivedMessages: acc.receivedMessages,
    iWriteFirstPct: acc.iWriteFirstPct,
    responseStats: acc.responseStats,
    activeDays,
    maxStreakDays,
    trend,
  })
  const insights = generateInsights({
    trend,
    longestGap,
    sessionStats,
    relationshipScore,
    responseStats: acc.responseStats,
  })
  acc.conversationFacts = {
    activeDays,
    longestGap,
    mostActiveDate: mostActiveDate ? { date: mostActiveDate.date, total: mostActiveDate.total } : null,
    maxStreakDays,
    firstMessageAt: acc.firstMessageAt?.toISOString() ?? null,
    silencePeriodsOver30Days: silencePeriodsOver30Days.sort((left, right) => right.seconds - left.seconds).slice(0, 8),
    trend,
    mostActiveMonth,
    sessionStats,
    relationshipScore,
    insights,
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

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value))
}

function average(values: number[]) {
  if (!values.length) {
    return 0
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function averageOrNull(values: number[]) {
  if (!values.length) {
    return null
  }

  return Math.round(average(values))
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
  const totalsByMonth = new Map(months.map((item) => [item.month, item.total]))
  const lastMonth = months[months.length - 1]?.month
  if (!lastMonth) {
    return 'unknown'
  }

  const monthWindow = buildMonthWindow(lastMonth, 6)
  const previousThree = monthWindow.slice(0, 3).reduce((sum, month) => sum + (totalsByMonth.get(month) ?? 0), 0)
  const lastThree = monthWindow.slice(3).reduce((sum, month) => sum + (totalsByMonth.get(month) ?? 0), 0)
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

function buildMonthWindow(lastMonth: string, count: number) {
  const [year, month] = lastMonth.split('-').map(Number)
  const cursor = new Date(year, month - 1, 1)
  cursor.setMonth(cursor.getMonth() - count + 1)

  return Array.from({ length: count }, () => {
    const value = toLocalMonthKey(cursor)
    cursor.setMonth(cursor.getMonth() + 1)
    return value
  })
}

function buildSessionStats(
  timeline: Array<{ outgoing: boolean; timestamp: Date }>,
  activeDays: number,
): SessionStatsDto {
  if (!timeline.length) {
    return createEmptySessionStats()
  }

  const sessions: SessionStatsDto['highlights'] = []
  let currentSession = {
    startedAt: timeline[0].timestamp,
    endedAt: timeline[0].timestamp,
    totalMessages: 1,
    sentMessages: timeline[0].outgoing ? 1 : 0,
    receivedMessages: timeline[0].outgoing ? 0 : 1,
  }

  for (let index = 1; index < timeline.length; index += 1) {
    const item = timeline[index]
    const previous = timeline[index - 1]
    const gapMs = item.timestamp.getTime() - previous.timestamp.getTime()

    if (gapMs > SESSION_BOUNDARY_MS) {
      sessions.push({
        startedAt: currentSession.startedAt.toISOString(),
        endedAt: currentSession.endedAt.toISOString(),
        durationSec: Math.max(0, Math.round((currentSession.endedAt.getTime() - currentSession.startedAt.getTime()) / 1000)),
        totalMessages: currentSession.totalMessages,
        sentMessages: currentSession.sentMessages,
        receivedMessages: currentSession.receivedMessages,
      })

      currentSession = {
        startedAt: item.timestamp,
        endedAt: item.timestamp,
        totalMessages: 1,
        sentMessages: item.outgoing ? 1 : 0,
        receivedMessages: item.outgoing ? 0 : 1,
      }
      continue
    }

    currentSession.endedAt = item.timestamp
    currentSession.totalMessages += 1
    if (item.outgoing) {
      currentSession.sentMessages += 1
    } else {
      currentSession.receivedMessages += 1
    }
  }

  sessions.push({
    startedAt: currentSession.startedAt.toISOString(),
    endedAt: currentSession.endedAt.toISOString(),
    durationSec: Math.max(0, Math.round((currentSession.endedAt.getTime() - currentSession.startedAt.getTime()) / 1000)),
    totalMessages: currentSession.totalMessages,
    sentMessages: currentSession.sentMessages,
    receivedMessages: currentSession.receivedMessages,
  })

  const durations = sessions.map((session) => session.durationSec)
  const messageCounts = sessions.map((session) => session.totalMessages)
  const nightSessions = sessions.filter((session) => {
    const hour = new Date(session.startedAt).getHours()
    return hour >= 23 || hour <= 5
  }).length
  const activeWeeks = Math.max(activeDays / 7, 1)
  const longestByDuration = [...sessions].sort((left, right) => right.durationSec - left.durationSec)[0] ?? null
  const densestByMessages = [...sessions].sort((left, right) => right.totalMessages - left.totalMessages)[0] ?? null
  const highlights = [densestByMessages, longestByDuration]
    .filter((value, index, items): value is NonNullable<typeof value> => Boolean(value) && items.indexOf(value) === index)
    .slice(0, 3)

  return {
    totalSessions: sessions.length,
    averageSessionMessages: Math.round(average(messageCounts)),
    averageSessionDurationSec: averageOrNull(durations),
    longestSessionMessages: Math.max(...messageCounts),
    longestSessionDurationSec: durations.length ? Math.max(...durations) : null,
    sessionsPerActiveWeek: Number((sessions.length / activeWeeks).toFixed(1)),
    nightSessionsPct: sessions.length ? Math.round((nightSessions / sessions.length) * 100) : null,
    highlights,
  }
}

function scoreResponsiveness(medianSeconds: number | null) {
  if (medianSeconds === null) {
    return null
  }

  if (medianSeconds <= 15 * 60) {
    return 100
  }
  if (medianSeconds <= 60 * 60) {
    return 85
  }
  if (medianSeconds <= 4 * 60 * 60) {
    return 65
  }
  if (medianSeconds <= 24 * 60 * 60) {
    return 40
  }
  return 20
}

function computeRelationshipScore(params: {
  privateLike: boolean
  sentMessages: number
  receivedMessages: number
  iWriteFirstPct: number | null
  responseStats: ResponseStatsDto
  activeDays: number
  maxStreakDays: number
  trend: ConversationFactsDto['trend']
}): RelationshipScoreDto | null {
  if (!params.privateLike) {
    return null
  }

  const totalMessages = params.sentMessages + params.receivedMessages
  if (!totalMessages) {
    return null
  }

  const shareDelta = Math.abs(params.sentMessages - params.receivedMessages) / totalMessages
  const reciprocity = clamp(Math.round((1 - shareDelta) * 100))
  const attentionBalance = params.iWriteFirstPct === null
    ? reciprocity
    : clamp(100 - Math.abs(params.iWriteFirstPct - 50) * 2)
  const responsivenessSamples = [params.responseStats.medianMineSec, params.responseStats.medianTheirsSec]
    .reduce<number[]>((acc, value) => {
      const scored = scoreResponsiveness(value)
      if (scored !== null) {
        acc.push(scored)
      }
      return acc
    }, [])
  const responsiveness = responsivenessSamples.length ? Math.round(average(responsivenessSamples)) : null
  const stability = clamp(Math.round(
    Math.min(1, params.activeDays / 60) * 45
    + Math.min(1, params.maxStreakDays / 21) * 35
    + (params.trend === 'fading' ? 5 : params.trend === 'growing' ? 20 : params.trend === 'stable' ? 15 : 10),
  ))
  const score = clamp(Math.round(
    reciprocity * 0.3
    + (responsiveness ?? 55) * 0.25
    + stability * 0.25
    + attentionBalance * 0.2,
  ))

  let label: RelationshipScoreDto['label'] = 'balanced'
  if (score >= 78 && params.trend !== 'fading') {
    label = 'warm'
  } else if (params.trend === 'fading' || (responsiveness !== null && responsiveness < 45)) {
    label = 'cooling'
  } else if (reciprocity < 45 || attentionBalance < 40) {
    label = 'one_sided'
  } else if (params.activeDays < 14 || params.maxStreakDays < 5) {
    label = 'emerging'
  }

  return {
    score,
    label,
    reciprocity,
    responsiveness,
    stability,
    attentionBalance,
  }
}

function generateInsights(params: {
  trend: ConversationFactsDto['trend']
  longestGap: ConversationFactsDto['longestGap']
  sessionStats: SessionStatsDto
  relationshipScore: RelationshipScoreDto | null
  responseStats: ResponseStatsDto
}): InsightDto[] {
  const insights: InsightDto[] = []

  if (params.sessionStats.totalSessions > 0) {
    insights.push({
      key: 'session-intensity',
      title: 'Conversation rhythm',
      description: `The chat formed ${params.sessionStats.totalSessions} sessions, averaging ${params.sessionStats.averageSessionMessages} messages each.`,
      tone: 'neutral',
    })
  }

  if (params.sessionStats.longestSessionDurationSec && params.sessionStats.longestSessionDurationSec >= 3 * 60 * 60) {
    insights.push({
      key: 'long-session',
      title: 'High-intensity window',
      description: `Your longest session lasted ${Math.round(params.sessionStats.longestSessionDurationSec / 3600)}h and reached ${params.sessionStats.longestSessionMessages} messages.`,
      tone: 'positive',
    })
  }

  if (params.trend === 'growing') {
    insights.push({
      key: 'trend-growing',
      title: 'Momentum is building',
      description: 'Recent activity is stronger than the previous period, which suggests the connection is warming up.',
      tone: 'positive',
    })
  } else if (params.trend === 'fading') {
    insights.push({
      key: 'trend-fading',
      title: 'Momentum cooled down',
      description: 'Recent activity dropped versus the previous period, so this conversation may be losing cadence.',
      tone: 'warning',
    })
  }

  if (params.longestGap && params.longestGap.seconds >= 45 * 24 * 60 * 60) {
    insights.push({
      key: 'long-gap',
      title: 'Extended silence',
      description: `There was a long break of about ${Math.round(params.longestGap.seconds / 86400)} days between messages.`,
      tone: 'warning',
    })
  }

  if (params.relationshipScore) {
    const tone = params.relationshipScore.label === 'cooling' || params.relationshipScore.label === 'one_sided'
      ? 'warning'
      : params.relationshipScore.label === 'warm'
        ? 'positive'
        : 'neutral'
    insights.push({
      key: 'relationship-score',
      title: 'Relationship dynamics',
      description: `The balance score is ${params.relationshipScore.score}/100 with a ${params.relationshipScore.label.replace('_', ' ')} pattern.`,
      tone,
    })
  }

  if ((params.responseStats.mineSamples + params.responseStats.theirsSamples) >= 6) {
    const myMedian = params.responseStats.medianMineSec
    const theirMedian = params.responseStats.medianTheirsSec
    if (myMedian !== null && theirMedian !== null) {
      const slowerSide = myMedian > theirMedian ? 'You' : 'Your contact'
      const gapHours = Math.abs(myMedian - theirMedian) / 3600
      if (gapHours >= 1) {
        insights.push({
          key: 'response-asymmetry',
          title: 'Reply tempo mismatch',
          description: `${slowerSide} usually respond slower, with a median gap difference of about ${gapHours.toFixed(1)} hours.`,
          tone: 'neutral',
        })
      }
    }
  }

  return insights.slice(0, 5)
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

function normalizeConversationFacts(value: (typeof schema.chatStats.$inferSelect)['conversationFacts']): ConversationFactsDto {
  const sessionStats = value?.sessionStats
  const relationshipScore = value?.relationshipScore

  return {
    activeDays: value?.activeDays ?? 0,
    longestGap: value?.longestGap ?? null,
    mostActiveDate: value?.mostActiveDate ?? null,
    maxStreakDays: value?.maxStreakDays ?? 0,
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


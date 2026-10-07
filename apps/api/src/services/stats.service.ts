import type {
  ActivityDistributionDto,
  AvailabilityProfileDto,
  ChatStatsDto,
  CompositionStatsDto,
  ConversationFactsDto,
  DirectionalCountDto,
  DirectionalTopItemsDto,
  GlobalStatsDto,
  GroupHealthDto,
  GroupPairDto,
  GroupParticipantDto,
  GroupReportDto,
  HealthScoreDto,
  InsightDto,
  MessageCompositionDto,
  MonthlyActivityDto,
  RelationshipScoreDto,
  ResponseStatsDto,
  SessionStatsDto,
  StreakInfoDto,
  TopItemDto,
} from '@tg-analyzer/shared'
import { resolveProductGroupRole } from '@tg-analyzer/shared'
import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { db, schema } from '../db'
import type { TelegramMessageLike } from './telegram.service'

const emojiRegex = /\p{Extended_Pictographic}/gu
const wordRegex = /[\p{L}\p{N}_-]{2,}/gu
const SESSION_BOUNDARY_MS = 8 * 60 * 60 * 1000
const GROUP_SESSION_BOUNDARY_MS = 4 * 60 * 60 * 1000
const LONG_SILENCE_MS = 30 * 24 * 60 * 60 * 1000
const IMPLIED_REPLY_WINDOW_MS = 10 * 60 * 1000
const RESPONSE_COVERAGE_WINDOW_MS = 30 * 60 * 1000
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
  averageMyResponseSec: number | null
  medianMyResponseSec: number | null
  medianTheirResponseSec: number | null
  iWriteFirstPct: number | null
  responseRate: number | null
  activityDistribution: ActivityDistributionDto
  compositionStats: CompositionStatsDto
  availabilityProfile: AvailabilityProfileDto
  healthScore: HealthScoreDto | null
  groupReport: GroupReportDto | null
}

export interface AggregationMessageInput {
  id?: number | string
  message?: string
  date?: Date
  outgoing?: boolean
  senderId?: string | null
  senderName?: string | null
  replyToMessageId?: number | string | null
  media?: boolean
  voice?: boolean
  sticker?: boolean
  file?: boolean
}

type ParticipantAccumulator = {
  id: string
  name: string
  isSelf: boolean
  messageCount: number
  wordCount: number
  mediaCount: number
  emojiCount: number
  firstSeen: Date | null
  lastSeen: Date | null
  activeDays: Set<string>
  starterCount: number
  replyCount: number
  repliesReceived: number
  wordCounts: Map<string, number>
  emojiCounts: Map<string, number>
}

type TimelineEntry = {
  messageId: string
  outgoing: boolean
  timestamp: Date
  senderId: string
  senderName: string
  replyToMessageId: string | null
}

export function createChatAccumulator(timeZone = 'UTC'): AggregatedChatStats & {
  timeZone: string
  wordCounts: Map<string, number>
  mineWordCounts: Map<string, number>
  theirsWordCounts: Map<string, number>
  emojiCounts: Map<string, number>
  mineEmojiCounts: Map<string, number>
  theirsEmojiCounts: Map<string, number>
  dayFirstMessageDirection: Map<string, boolean>
  timeline: TimelineEntry[]
  mineWords: number
  theirsWords: number
  mineTextMessages: number
  theirsTextMessages: number
  participants: Map<string, ParticipantAccumulator>
  messageIndex: Map<string, { senderId: string; senderName: string }>
  totalEmojiCount: number
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
    responseStats: {
      medianMineSec: null,
      medianTheirsSec: null,
      mineSamples: 0,
      theirsSamples: 0,
      mineP25Sec: null,
      mineP75Sec: null,
      mineP95Sec: null,
      theirsP25Sec: null,
      theirsP75Sec: null,
      theirsP95Sec: null,
    },
    messageComposition: { text: 0, media: 0, voice: 0, sticker: 0, file: 0 },
    conversationFacts: {
      activeDays: 0,
      longestGap: null,
      mostActiveDate: null,
      maxStreakDays: 0,
      maxStreak: null,
      firstMessageAt: null,
      silencePeriodsOver30Days: [],
      trend: 'unknown',
      mostActiveMonth: null,
      sessionStats: createEmptySessionStats(),
      relationshipScore: null,
      insights: [],
    },
    wordsPerMessage: { mine: null, theirs: null },
    averageMyResponseSec: null,
    medianMyResponseSec: null,
    medianTheirResponseSec: null,
    iWriteFirstPct: null,
    responseRate: null,
    activityDistribution: createEmptyActivityDistribution(),
    compositionStats: createEmptyCompositionStats(),
    availabilityProfile: createEmptyAvailabilityProfile(),
    healthScore: null,
    groupReport: null,
    timeZone,
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
    participants: new Map(),
    messageIndex: new Map(),
    totalEmojiCount: 0,
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

function createEmptyActivityDistribution(): ActivityDistributionDto {
  return {
    night: createDirectionalCount(),
    morning: createDirectionalCount(),
    afternoon: createDirectionalCount(),
    evening: createDirectionalCount(),
  }
}

function createEmptyCompositionStats(): CompositionStatsDto {
  return {
    textSharePct: null,
    mediaSharePct: null,
    voiceSharePct: null,
    stickerSharePct: null,
    fileSharePct: null,
    avgCharsPerTextMessage: null,
  }
}

function createEmptyAvailabilityProfile(): AvailabilityProfileDto {
  return {
    activeHours: 0,
    activeHoursPct: 0,
    concentrationIndex: null,
    predictability: 'low',
    peakWindow: null,
    secondaryWindow: null,
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

function normalizeTimeZone(timeZone: string) {
  try {
    return Intl.DateTimeFormat('en-US', { timeZone }).resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

function getZonedDateParts(date: Date, timeZone: string) {
  const normalized = normalizeTimeZone(timeZone)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: normalized,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  }).formatToParts(date)

  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  const weekdayLabel = read('weekday')
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: Number(read('hour') || '0'),
    weekday: weekdayMap[weekdayLabel] ?? 0,
  }
}

function toLocalDayKey(date: Date, timeZone: string) {
  const parts = getZonedDateParts(date, timeZone)
  return `${parts.year}-${parts.month}-${parts.day}`
}

function toLocalMonthKey(date: Date, timeZone: string) {
  const parts = getZonedDateParts(date, timeZone)
  return `${parts.year}-${parts.month}`
}

function getLocalHour(date: Date, timeZone: string) {
  return getZonedDateParts(date, timeZone).hour
}

function getLocalWeekday(date: Date, timeZone: string) {
  return getZonedDateParts(date, timeZone).weekday
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

function toMessageKey(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null
  }

  return String(value)
}

function fallbackParticipantName(senderId: string, outgoing: boolean) {
  return outgoing ? 'You' : senderId === 'unknown' ? 'Name unavailable' : `Profile ${senderId}`
}

function ensureParticipant(
  acc: ReturnType<typeof createChatAccumulator>,
  senderId: string,
  senderName: string | null | undefined,
  outgoing: boolean,
) {
  const existing = acc.participants.get(senderId)
  if (existing) {
    if (senderName && senderName.trim()) {
      existing.name = senderName.trim()
    }
    if (outgoing) {
      existing.isSelf = true
    }
    return existing
  }

  const resolvedName = normalizeParticipantName(senderName?.trim() || fallbackParticipantName(senderId, outgoing))
  const next: ParticipantAccumulator = {
    id: senderId,
    name: resolvedName,
    isSelf: outgoing,
    messageCount: 0,
    wordCount: 0,
    mediaCount: 0,
    emojiCount: 0,
    firstSeen: null,
    lastSeen: null,
    activeDays: new Set(),
    starterCount: 0,
    replyCount: 0,
    repliesReceived: 0,
    wordCounts: new Map(),
    emojiCounts: new Map(),
  }
  acc.participants.set(senderId, next)
  return next
}

function normalizeParticipantName(name: string) {
  const normalized = name.trim()
  if (!normalized) {
    return 'Name unavailable'
  }
  if (/^user unknown$/i.test(normalized) || /^unknown$/i.test(normalized) || /^unknown participant$/i.test(normalized)) {
    return 'Name unavailable'
  }
  return normalized
}

export function aggregateMessage(
  message: AggregationMessageInput,
  acc: ReturnType<typeof createChatAccumulator>,
) {
  const outgoing = Boolean(message.outgoing)
  const senderId = message.senderId?.trim() || (outgoing ? 'self' : 'unknown')
  const participant = ensureParticipant(acc, senderId, message.senderName, outgoing)
  acc.totalMessages += 1
  if (outgoing) {
    acc.sentMessages += 1
  } else {
    acc.receivedMessages += 1
  }

  const timestamp = normalizeMessageDate(message.date) ?? new Date()
  const hour = String(getLocalHour(timestamp, acc.timeZone))
  acc.hourlyActivity[hour] = (acc.hourlyActivity[hour] ?? 0) + 1
  incrementDirectional(acc.hourlyActivitySplit[hour] ?? createDirectionalCount(), outgoing)
  acc.hourlyActivitySplit[hour] = acc.hourlyActivitySplit[hour] ?? createDirectionalCount()

  const day = toLocalDayKey(timestamp, acc.timeZone)
  const daily = acc.dailyActivity.get(day) ?? { sent: 0, received: 0 }
  if (!acc.dayFirstMessageDirection.has(day)) {
    acc.dayFirstMessageDirection.set(day, outgoing)
  }
  if (outgoing) {
    daily.sent += 1
  } else {
    daily.received += 1
  }
  acc.dailyActivity.set(day, daily)
  participant.activeDays.add(day)

  const weekday = String(getLocalWeekday(timestamp, acc.timeZone))
  incrementDirectional(acc.weekdayActivity[weekday], outgoing)

  const month = toLocalMonthKey(timestamp, acc.timeZone)
  const monthly = acc.monthlyActivity.get(month) ?? createDirectionalCount()
  incrementDirectional(monthly, outgoing)
  acc.monthlyActivity.set(month, monthly)

  if (!acc.firstMessageAt || timestamp < acc.firstMessageAt) {
    acc.firstMessageAt = timestamp
  }
  if (!acc.lastMessageAt || timestamp > acc.lastMessageAt) {
    acc.lastMessageAt = timestamp
  }

  const messageId = toMessageKey(message.id) ?? `${timestamp.getTime()}:${acc.totalMessages}`
  const replyToMessageId = toMessageKey(message.replyToMessageId)
  acc.timeline.push({
    messageId,
    outgoing,
    timestamp,
    senderId,
    senderName: participant.name,
    replyToMessageId,
  })
  acc.messageIndex.set(messageId, { senderId, senderName: participant.name })

  const text = message.message ?? ''
  acc.totalChars += text.length
  const messageType = primaryMessageType(message)
  acc.messageComposition[messageType] += 1
  if (messageType === 'text') {
    acc.textMessageCount += 1
    if (outgoing) {
      acc.mineTextMessages += 1
    } else {
      acc.theirsTextMessages += 1
    }
  }

  const words = text.match(wordRegex) ?? []
  acc.totalWords += words.length
  if (outgoing) {
    acc.mineWords += words.length
  } else {
    acc.theirsWords += words.length
  }
  participant.messageCount += 1
  participant.wordCount += words.length
  if (!participant.firstSeen || timestamp < participant.firstSeen) {
    participant.firstSeen = timestamp
  }
  if (!participant.lastSeen || timestamp > participant.lastSeen) {
    participant.lastSeen = timestamp
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
    participant.wordCounts.set(normalized, (participant.wordCounts.get(normalized) ?? 0) + 1)
    const directionalWords = outgoing ? acc.mineWordCounts : acc.theirsWordCounts
    directionalWords.set(normalized, (directionalWords.get(normalized) ?? 0) + 1)
  }

  const emoji = text.match(emojiRegex) ?? []
  for (const item of emoji) {
    acc.totalEmojiCount += 1
    participant.emojiCount += 1
    acc.emojiCounts.set(item, (acc.emojiCounts.get(item) ?? 0) + 1)
    participant.emojiCounts.set(item, (participant.emojiCounts.get(item) ?? 0) + 1)
    const directionalEmoji = outgoing ? acc.mineEmojiCounts : acc.theirsEmojiCounts
    directionalEmoji.set(item, (directionalEmoji.get(item) ?? 0) + 1)
  }

  acc.mediaCount += Number(messageType === 'media')
  acc.voiceCount += Number(messageType === 'voice')
  acc.stickerCount += Number(messageType === 'sticker')
  acc.fileCount += Number(messageType === 'file')
  participant.mediaCount += Number(messageType !== 'text')
}

export function projectTelegramMessageMetadata(message: TelegramMessageLike): AggregationMessageInput {
  return {
    id: message?.id,
    message: typeof message?.message === 'string' ? message.message : '',
    date: normalizeMessageDate(message?.date),
    outgoing: Boolean(message?.outgoing ?? message?.out),
    senderId: extractSenderId(message),
    senderName: extractSenderName(message),
    replyToMessageId: extractReplyToMessageId(message),
    media: Boolean(message?.media),
    voice: Boolean(message?.voice),
    sticker: Boolean(message?.sticker),
    file: Boolean(message?.file),
  }
}

function extractSenderId(message: TelegramMessageLike) {
  const candidate =
    readNestedValue(message, ['senderId', 'value'])
    ?? readNestedValue(message, ['senderId', 'userId'])
    ?? readNestedValue(message, ['senderId', 'channelId'])
    ?? readNestedValue(message, ['senderId', 'chatId'])
    ?? readNestedValue(message, ['fromId', 'value'])
    ?? readNestedValue(message, ['fromId', 'userId'])
    ?? readNestedValue(message, ['fromId', 'channelId'])
    ?? readNestedValue(message, ['fromId', 'chatId'])
    ?? readNestedValue(message, ['sender', 'id'])
    ?? readNestedValue(message, ['sender', 'userId'])

  return candidate !== null && candidate !== undefined ? String(candidate) : null
}

function extractSenderName(message: TelegramMessageLike) {
  const sender = readNestedValue(message, ['sender'])
  if (sender && typeof sender === 'object') {
    const senderRecord = sender as Record<string, unknown>
    const firstName = typeof senderRecord.firstName === 'string' ? senderRecord.firstName : ''
    const lastName = typeof senderRecord.lastName === 'string' ? senderRecord.lastName : ''
    const title = typeof senderRecord.title === 'string' ? senderRecord.title : ''
    const username = typeof senderRecord.username === 'string' ? senderRecord.username : ''
    const combined = [firstName, lastName].filter(Boolean).join(' ').trim()
    if (combined) {
      return combined
    }
    if (title) {
      return title
    }
    if (username) {
      return username
    }
  }

  const directName = typeof readNestedValue(message, ['senderName']) === 'string'
    ? String(readNestedValue(message, ['senderName']))
    : null

  return directName
}

function extractReplyToMessageId(message: TelegramMessageLike) {
  const candidate =
    readNestedValue(message, ['replyTo', 'replyToMsgId'])
    ?? readNestedValue(message, ['replyTo', 'replyToMsgIds', 0])
    ?? readNestedValue(message, ['replyToMessageId'])
    ?? readNestedValue(message, ['replyToMsgId'])

  return candidate !== null && candidate !== undefined ? String(candidate) : null
}

function readNestedValue(source: unknown, path: Array<string | number>) {
  let current = source
  for (const segment of path) {
    if (!current || typeof current !== 'object') {
      return null
    }
    current = (current as Record<string | number, unknown>)[segment]
  }
  return current ?? null
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
  const groupLike = chatType === 'group'
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
      mineP25Sec: percentile(mineResponseSeconds, 25),
      mineP75Sec: percentile(mineResponseSeconds, 75),
      mineP95Sec: percentile(mineResponseSeconds, 95),
      theirsP25Sec: percentile(theirsResponseSeconds, 25),
      theirsP75Sec: percentile(theirsResponseSeconds, 75),
      theirsP95Sec: percentile(theirsResponseSeconds, 95),
    }
    acc.averageMyResponseSec = averageMineSec
    acc.medianMyResponseSec = medianMineSec
    acc.medianTheirResponseSec = medianTheirsSec
    acc.responseRate = computeResponseRate(timeline)

    if (sessionStarts.length > 0) {
      const outgoingStarts = sessionStarts.filter(Boolean).length
      acc.iWriteFirstPct = Math.round((outgoingStarts / sessionStarts.length) * 100)
    }
  } else {
    acc.responseStats = {
      medianMineSec: null,
      medianTheirsSec: null,
      mineSamples: 0,
      theirsSamples: 0,
      mineP25Sec: null,
      mineP75Sec: null,
      mineP95Sec: null,
      theirsP25Sec: null,
      theirsP75Sec: null,
      theirsP95Sec: null,
    }
    acc.averageMyResponseSec = null
    acc.medianMyResponseSec = null
    acc.medianTheirResponseSec = null
    acc.iWriteFirstPct = null
    acc.responseRate = null
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
  const maxStreak = computeMaxStreak(Array.from(acc.dailyActivity.keys()))
  const trend = computeTrend(monthlyRows)
  const sessionStats = buildSessionStats(timeline, activeDays, acc.timeZone)
  acc.activityDistribution = computeActivityDistribution(acc.hourlyActivitySplit)
  acc.compositionStats = computeCompositionStats({
    totalMessages: acc.totalMessages,
    totalChars: acc.totalChars,
    textMessageCount: acc.textMessageCount,
    messageComposition: acc.messageComposition,
  })
  acc.availabilityProfile = computeAvailabilityProfile(acc.hourlyActivity)
  const relationshipScore = computeRelationshipScore({
    privateLike,
    sentMessages: acc.sentMessages,
    receivedMessages: acc.receivedMessages,
    iWriteFirstPct: acc.iWriteFirstPct,
    responseStats: acc.responseStats,
    activeDays,
    maxStreakDays: maxStreak.days,
    trend,
  })
  acc.healthScore = computeHealthScore({
    responseRate: acc.responseRate,
    sessionStats,
    activeDays,
    relationshipScore,
    trend,
  })
  const insights = generateInsights({
    trend,
    longestGap,
    sessionStats,
    relationshipScore,
    responseStats: acc.responseStats,
  })
  acc.groupReport = groupLike
    ? computeGroupReport({
        acc,
        timeline,
        activeDays,
      })
    : null
  acc.conversationFacts = {
    activeDays,
    longestGap,
    mostActiveDate: mostActiveDate ? { date: mostActiveDate.date, total: mostActiveDate.total } : null,
    maxStreakDays: maxStreak.days,
    maxStreak,
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

function computeGroupReport(params: {
  acc: ReturnType<typeof createChatAccumulator>
  timeline: TimelineEntry[]
  activeDays: number
}): GroupReportDto {
  const { acc, timeline, activeDays } = params
  const totalMessages = acc.totalMessages
  const totalMedia = acc.mediaCount + acc.voiceCount + acc.stickerCount + acc.fileCount
  const participants = Array.from(acc.participants.values())
  const activeMembers = participants.length
  const lastMessageAt = acc.lastMessageAt ?? new Date()
  const firstMessageAt = acc.firstMessageAt ?? lastMessageAt
  const durationDays = Math.max(
    1,
    Math.ceil((lastMessageAt.getTime() - firstMessageAt.getTime()) / (24 * 60 * 60 * 1000)) + 1,
  )
  const now = new Date()

  const directPairCounts = new Map<string, number>()
  const impliedPairCounts = new Map<string, number>()
  const participantById = new Map(participants.map((participant) => [participant.id, participant]))

  let totalSessions = 0
  let respondedMessages = 0
  const hourlyParticipants = new Map<string, Set<string>>()

  for (let index = 0; index < timeline.length; index += 1) {
    const current = timeline[index]
    const currentParticipant = participantById.get(current.senderId)
    if (!currentParticipant) {
      continue
    }

    const hourKey = `${toLocalDayKey(current.timestamp, acc.timeZone)}:${String(getLocalHour(current.timestamp, acc.timeZone)).padStart(2, '0')}`
    const hourParticipants = hourlyParticipants.get(hourKey) ?? new Set<string>()
    hourParticipants.add(current.senderId)
    hourlyParticipants.set(hourKey, hourParticipants)

    const previous = timeline[index - 1]
    if (!previous || (current.timestamp.getTime() - previous.timestamp.getTime()) > GROUP_SESSION_BOUNDARY_MS) {
      currentParticipant.starterCount += 1
      totalSessions += 1
    }

    if (current.replyToMessageId) {
      const repliedTo = acc.messageIndex.get(current.replyToMessageId)
      if (repliedTo && repliedTo.senderId !== current.senderId) {
        currentParticipant.replyCount += 1
        const recipient = participantById.get(repliedTo.senderId)
        if (recipient) {
          recipient.repliesReceived += 1
        }
        const pairKey = `${repliedTo.senderId}|${current.senderId}`
        directPairCounts.set(pairKey, (directPairCounts.get(pairKey) ?? 0) + 1)
      }
    } else if (previous && previous.senderId !== current.senderId) {
      const gapMs = current.timestamp.getTime() - previous.timestamp.getTime()
      if (gapMs >= 0 && gapMs <= IMPLIED_REPLY_WINDOW_MS) {
        const pairKey = `${previous.senderId}|${current.senderId}`
        impliedPairCounts.set(pairKey, (impliedPairCounts.get(pairKey) ?? 0) + 1)
      }
    }

    let covered = false
    for (let lookahead = index + 1; lookahead < timeline.length; lookahead += 1) {
      const next = timeline[lookahead]
      const gapMs = next.timestamp.getTime() - current.timestamp.getTime()
      if (gapMs > RESPONSE_COVERAGE_WINDOW_MS) {
        break
      }
      if (next.senderId !== current.senderId) {
        covered = true
        break
      }
    }
    if (covered) {
      respondedMessages += 1
    }
  }

  const participantWordPresence = new Map<string, number>()
  for (const participant of participants) {
    for (const word of participant.wordCounts.keys()) {
      participantWordPresence.set(word, (participantWordPresence.get(word) ?? 0) + 1)
    }
  }

  const sharedVocabularyThreshold = Math.max(1, Math.ceil(activeMembers * 0.5))
  const sharedVocabulary = mapToTopItems(
    new Map(
      Array.from(acc.wordCounts.entries()).filter(([word]) => (participantWordPresence.get(word) ?? 0) >= sharedVocabularyThreshold),
    ),
    15,
  )
  const uniqueGroupWords = mapToTopItems(
    new Map(
      Array.from(acc.wordCounts.entries()).filter(([word, count]) => {
        const presence = participantWordPresence.get(word) ?? 0
        return count >= 3 && presence <= Math.max(1, Math.floor(activeMembers * 0.3))
      }),
    ),
    15,
  )

  const activeMembersLast30Days = participants.filter((participant) => participant.lastSeen && (now.getTime() - participant.lastSeen.getTime()) <= (30 * 24 * 60 * 60 * 1000)).length
  const previousWindowStart = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000))
  const previousWindowEnd = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000))
  const previousActiveMembers = participants.filter((participant) => participant.lastSeen && participant.lastSeen >= previousWindowStart && participant.lastSeen < previousWindowEnd).length
  const momentum: GroupHealthDto['momentum'] = previousActiveMembers > 0
    ? activeMembersLast30Days > previousActiveMembers * 1.15
      ? 'growing'
      : activeMembersLast30Days < previousActiveMembers * 0.85
        ? 'shrinking'
        : 'stable'
    : activeMembersLast30Days > 0
      ? 'growing'
      : 'stable'

  const earlyWindowEnd = new Date(firstMessageAt.getTime() + (90 * 24 * 60 * 60 * 1000))
  const recentWindowStart = new Date(lastMessageAt.getTime() - (90 * 24 * 60 * 60 * 1000))
  const earlyActive = new Set(
    participants
      .filter((participant) => participant.firstSeen && participant.firstSeen <= earlyWindowEnd)
      .map((participant) => participant.id),
  )
  const recentActive = new Set(
    participants
      .filter((participant) => participant.lastSeen && participant.lastSeen >= recentWindowStart)
      .map((participant) => participant.id),
  )
  const retained = Array.from(earlyActive).filter((participantId) => recentActive.has(participantId)).length
  const retentionRate = earlyActive.size ? Number(((retained / earlyActive.size) * 100).toFixed(1)) : 100

  const firstHalfBoundary = new Date(firstMessageAt.getTime() + ((lastMessageAt.getTime() - firstMessageAt.getTime()) / 2))
  const churnedMembers = participants.filter((participant) =>
    participant.lastSeen
    && participant.lastSeen < new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000))
    && participant.firstSeen
    && participant.firstSeen < firstHalfBoundary)

  const shares = participants.map((participant) => totalMessages ? participant.messageCount / totalMessages : 0).sort((left, right) => left - right)
  const meanShare = shares.length ? average(shares) : 0
  const giniCoefficient = shares.length && meanShare
    ? Number((shares.reduce((sum, share, index) => sum + ((2 * (index + 1)) - shares.length - 1) * share, 0) / (shares.length * shares.length * meanShare)).toFixed(3))
    : 0
  const lurkerRatio = activeMembers
    ? Number(((participants.filter((participant) => totalMessages ? ((participant.messageCount / totalMessages) * 100) < 0.5 : true).length / activeMembers) * 100).toFixed(1))
    : 0
  const responseCoverage = totalMessages ? Number(((respondedMessages / totalMessages) * 100).toFixed(1)) : 0
  const consistency = Number(((activeDays / durationDays) * 100).toFixed(1))
  const peakSimultaneity = Array.from(hourlyParticipants.values()).reduce((max, set) => Math.max(max, set.size), 0)
  const healthScore = Number((
    ((1 - giniCoefficient) * 100 * 0.30)
    + (retentionRate * 0.25)
    + (consistency * 0.25)
    + (responseCoverage * 0.20)
  ).toFixed(1))

  const participantsDto: GroupParticipantDto[] = participants
    .map((participant) => {
      const messageShare = totalMessages ? Number(((participant.messageCount / totalMessages) * 100).toFixed(1)) : 0
      const mediaShare = totalMedia ? Number(((participant.mediaCount / totalMedia) * 100).toFixed(1)) : 0
      const avgWordsPerMessage = participant.messageCount ? Number((participant.wordCount / participant.messageCount).toFixed(2)) : null
      const starterShare = totalSessions ? Number(((participant.starterCount / totalSessions) * 100).toFixed(1)) : 0
      const consistencyScore = Number(((participant.activeDays.size / durationDays) * 100).toFixed(1))
      const magnetScore = participant.messageCount ? Number((participant.repliesReceived / participant.messageCount).toFixed(2)) : null
      const replyRatio = participant.messageCount ? Number((participant.replyCount / participant.messageCount).toFixed(2)) : null
      const emojiShare = acc.totalEmojiCount ? (participant.emojiCount / acc.totalEmojiCount) * 100 : 0
      const role = resolveGroupRole({
        messageShare,
        consistencyScore,
        starterShare,
        firstSeen: participant.firstSeen,
        lastSeen: participant.lastSeen,
        messageCount: participant.messageCount,
        now,
      })
      const topicSignature = computeTopicSignature(participant.wordCounts, acc.wordCounts)

      return {
        id: participant.id,
        name: participant.name,
        isSelf: participant.isSelf,
        role,
        messageCount: participant.messageCount,
        messageShare,
        wordCount: participant.wordCount,
        avgWordsPerMessage,
        mediaCount: participant.mediaCount,
        mediaShare,
        firstSeen: participant.firstSeen?.toISOString() ?? null,
        lastSeen: participant.lastSeen?.toISOString() ?? null,
        activeDays: participant.activeDays.size,
        consistencyScore,
        starterCount: participant.starterCount,
        starterShare,
        replyCount: participant.replyCount,
        repliesReceived: participant.repliesReceived,
        magnetScore,
        replyRatio,
        topWords: mapToTopItems(participant.wordCounts, 5),
        topEmoji: mapToTopItems(participant.emojiCounts, 5),
        topicSignature,
      }
    })
    .sort((left, right) => right.messageCount - left.messageCount)

  const topPairs = buildGroupTopPairs({
    participantsById: new Map(participantsDto.map((participant) => [participant.id, participant])),
    directPairCounts,
    impliedPairCounts,
  })

  return {
    participants: participantsDto,
    topPairs,
    health: {
      score: healthScore,
      giniCoefficient,
      lurkerRatio,
      retentionRate,
      responseCoverage,
      consistency,
      momentum,
      activeMembers,
      activeMembersLast30Days,
      churnedMembers: churnedMembers.length,
      peakSimultaneity,
    },
    sharedVocabulary,
    uniqueGroupWords,
  }
}

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

function computeTopicSignature(source: Map<string, number>, total: Map<string, number>) {
  const sourceTotal = Array.from(source.values()).reduce((sum, value) => sum + value, 0)
  const totalWords = Array.from(total.values()).reduce((sum, value) => sum + value, 0)
  if (!sourceTotal || !totalWords) {
    return [] as TopItemDto[]
  }

  return Array.from(source.entries())
    .map(([word, count]) => {
      const localShare = count / sourceTotal
      const globalShare = (total.get(word) ?? count) / totalWords
      return {
        value: word,
        count: Number((localShare / Math.max(globalShare, 1 / totalWords)).toFixed(2)),
      }
    })
    .sort((left, right) => right.count - left.count)
    .slice(0, 5)
}

function buildGroupTopPairs(params: {
  participantsById: Map<string, GroupParticipantDto>
  directPairCounts: Map<string, number>
  impliedPairCounts: Map<string, number>
}): GroupPairDto[] {
  const pairKeys = new Set<string>()
  for (const key of params.directPairCounts.keys()) {
    pairKeys.add(key)
  }
  for (const key of params.impliedPairCounts.keys()) {
    pairKeys.add(key)
  }

  const combined = new Map<string, GroupPairDto>()
  for (const key of pairKeys) {
    const [leftId, rightId] = key.split('|')
    if (!leftId || !rightId || leftId === rightId) {
      continue
    }
    const normalizedKey = [leftId, rightId].sort().join('|')
    if (combined.has(normalizedKey)) {
      continue
    }
    const directReplies = (params.directPairCounts.get(`${leftId}|${rightId}`) ?? 0) + (params.directPairCounts.get(`${rightId}|${leftId}`) ?? 0)
    const impliedReplies = (params.impliedPairCounts.get(`${leftId}|${rightId}`) ?? 0) + (params.impliedPairCounts.get(`${rightId}|${leftId}`) ?? 0)
    const symmetricScore = (directReplies * 2) + impliedReplies
    if (!symmetricScore) {
      continue
    }
    const left = params.participantsById.get(leftId)
    const right = params.participantsById.get(rightId)
    if (!left || !right) {
      continue
    }
    combined.set(normalizedKey, {
      leftParticipantId: left.id,
      leftParticipantName: left.name,
      rightParticipantId: right.id,
      rightParticipantName: right.name,
      symmetricScore,
      directReplies,
      impliedReplies,
    })
  }

  return Array.from(combined.values())
    .sort((left, right) => right.symmetricScore - left.symmetricScore)
    .slice(0, 5)
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

function percentile(values: number[], p: number) {
  if (!values.length) {
    return null
  }
  const sorted = [...values].sort((left, right) => left - right)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[index] ?? null
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
  let currentStart: string | null = null
  let bestStart: string | null = null
  let bestEnd: string | null = null

  for (const day of sorted) {
    const time = new Date(`${day}T00:00:00`).getTime()
    if (!previousTime || time - previousTime === 24 * 60 * 60 * 1000) {
      if (!current) {
        currentStart = day
      }
      current += 1
    } else {
      current = 1
      currentStart = day
    }
    if (current > max) {
      max = current
      bestStart = currentStart
      bestEnd = day
    }
    previousTime = time
  }

  return {
    days: max,
    startDate: bestStart,
    endDate: bestEnd,
  } satisfies StreakInfoDto
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
    const value = `${cursor.getFullYear()}-${padNumber(cursor.getMonth() + 1)}`
    cursor.setMonth(cursor.getMonth() + 1)
    return value
  })
}

function buildSessionStats(
  timeline: Array<{ outgoing: boolean; timestamp: Date }>,
  activeDays: number,
  timeZone: string,
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
    const hour = getLocalHour(new Date(session.startedAt), timeZone)
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

function computeResponseRate(timeline: Array<{ outgoing: boolean; timestamp: Date }>) {
  if (timeline.length < 2) {
    return null
  }

  let totalTurns = 0
  let repliedTurns = 0
  let turnOutgoing = timeline[0].outgoing

  for (let index = 1; index < timeline.length; index += 1) {
    const current = timeline[index]
    const previous = timeline[index - 1]
    const gapMs = current.timestamp.getTime() - previous.timestamp.getTime()

    if (gapMs > SESSION_BOUNDARY_MS) {
      totalTurns += 1
      turnOutgoing = current.outgoing
      continue
    }

    if (current.outgoing !== turnOutgoing) {
      totalTurns += 1
      repliedTurns += 1
      turnOutgoing = current.outgoing
      continue
    }
  }

  totalTurns += 1

  return totalTurns ? Number(((repliedTurns / totalTurns) * 100).toFixed(2)) : null
}

function bucketForHour(hour: number): keyof ActivityDistributionDto {
  if (hour <= 5) {
    return 'night'
  }
  if (hour <= 11) {
    return 'morning'
  }
  if (hour <= 17) {
    return 'afternoon'
  }
  return 'evening'
}

function computeActivityDistribution(activity: Record<string, DirectionalCountDto>) {
  const result = createEmptyActivityDistribution()
  for (const [hourLabel, counts] of Object.entries(activity)) {
    const hour = Number(hourLabel)
    const bucket = bucketForHour(hour)
    result[bucket].sent += counts?.sent ?? 0
    result[bucket].received += counts?.received ?? 0
    result[bucket].total += counts?.total ?? 0
  }
  return result
}

function computeCompositionStats(params: {
  totalMessages: number
  totalChars: number
  textMessageCount: number
  messageComposition: MessageCompositionDto
}): CompositionStatsDto {
  if (!params.totalMessages) {
    return createEmptyCompositionStats()
  }

  return {
    textSharePct: Number(((params.messageComposition.text / params.totalMessages) * 100).toFixed(2)),
    mediaSharePct: Number(((params.messageComposition.media / params.totalMessages) * 100).toFixed(2)),
    voiceSharePct: Number(((params.messageComposition.voice / params.totalMessages) * 100).toFixed(2)),
    stickerSharePct: Number(((params.messageComposition.sticker / params.totalMessages) * 100).toFixed(2)),
    fileSharePct: Number(((params.messageComposition.file / params.totalMessages) * 100).toFixed(2)),
    avgCharsPerTextMessage: params.textMessageCount ? Number((params.totalChars / params.textMessageCount).toFixed(2)) : null,
  }
}

function buildWindowLabel(hours: number[]) {
  if (!hours.length) {
    return null
  }
  const sorted = [...hours].sort((left, right) => right - left)
  const start = sorted[sorted.length - 1]
  const end = sorted[0]
  return `${padNumber(start)}:00-${padNumber((end + 1) % 24)}:00`
}

function computeAvailabilityProfile(hourlyActivity: Record<string, number>): AvailabilityProfileDto {
  const entries = Object.entries(hourlyActivity).map(([hour, total]) => ({ hour: Number(hour), total }))
  const activeHours = entries.filter((entry) => entry.total > 0)
  const totalMessages = entries.reduce((sum, entry) => sum + entry.total, 0)
  const peakHours = [...entries].sort((left, right) => right.total - left.total).slice(0, 3)
  const peakWindow = buildWindowLabel(peakHours.map((entry) => entry.hour))
  const secondaryWindow = peakHours.length >= 2 ? buildWindowLabel(peakHours.slice(1).map((entry) => entry.hour)) : null
  const averageHourly = entries.length ? totalMessages / entries.length : 0
  const maxHourly = peakHours[0]?.total ?? 0
  const concentrationIndex = averageHourly > 0 ? Number((maxHourly / averageHourly).toFixed(2)) : null
  const predictability = concentrationIndex === null || concentrationIndex < 2
    ? 'low'
    : concentrationIndex < 3.5
      ? 'medium'
      : 'high'

  return {
    activeHours: activeHours.length,
    activeHoursPct: Number(((activeHours.length / 24) * 100).toFixed(2)),
    concentrationIndex,
    predictability,
    peakWindow,
    secondaryWindow,
  }
}

function computeHealthScore(params: {
  responseRate: number | null
  sessionStats: SessionStatsDto
  activeDays: number
  relationshipScore: RelationshipScoreDto | null
  trend: ConversationFactsDto['trend']
}): HealthScoreDto | null {
  if (!params.relationshipScore) {
    return null
  }

  const fragmentation = params.activeDays
    ? Math.min(1, params.sessionStats.totalSessions / Math.max(params.activeDays, 1))
    : 1
  const initiativeBalance = params.relationshipScore.attentionBalance
  const longTermStability = clamp(Math.round(
    (params.relationshipScore.stability ?? 50) * 0.7
    + (params.trend === 'growing' ? 90 : params.trend === 'stable' ? 75 : params.trend === 'fading' ? 35 : 55) * 0.3,
  ))
  const responseRateScore = params.responseRate ?? 55
  const score = clamp(Math.round(
    responseRateScore * 0.3
    + (100 - fragmentation * 50) * 0.2
    + (initiativeBalance ?? 50) * 0.2
    + longTermStability * 0.3,
  ))

  let label: HealthScoreDto['label'] = 'steady'
  if (score >= 80) {
    label = 'strong'
  } else if (score < 45) {
    label = 'fragile'
  } else if ((initiativeBalance ?? 100) < 40) {
    label = 'imbalanced'
  }

  return {
    score,
    label,
    responseRate: params.responseRate,
    fragmentation: Number((fragmentation * 100).toFixed(2)),
    initiativeBalance,
    longTermStability,
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
    (row.totalMessages ?? 0)
      - (row.mediaCount ?? 0)
      - (row.voiceCount ?? 0)
      - (row.stickerCount ?? 0)
      - (row.fileCount ?? 0),
    0,
  )
}

function resolveMessageComposition(row: typeof schema.chatStats.$inferSelect, textMessageCount: number): MessageCompositionDto {
  const storedComposition = row.messageComposition ?? null
  const storedCompositionTotal = storedComposition
    ? storedComposition.text + storedComposition.media + storedComposition.voice + storedComposition.sticker + storedComposition.file
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

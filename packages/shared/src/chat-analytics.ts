import type {
  ActivityDistributionDto,
  AvailabilityProfileDto,
  CompositionStatsDto,
  ConversationFactsDto,
  DirectionalCountDto,
  DirectionalTopItemsDto,
  GroupReportDto,
  HealthScoreDto,
  MessageCompositionDto,
  ResponseStatsDto,
  SessionStatsDto,
  TopItemDto,
} from './api'
import { computeMaxStreak, computeTrend, mapDailyActivity, mapMonthlyActivity } from './activity-analytics'
import { generateConversationInsights } from './conversation-insights'
import { computeConversationTimelineAnalytics } from './conversation-timeline-analytics'
import { computeGroupReportAnalytics } from './group-report-analytics'
import { analyzeMessageText } from './message-text-analytics'
import { computeActivityDistribution, computeAvailabilityProfile, computeCompositionStats } from './message-analytics'
import { computeHealthScore, computeRelationshipScore } from './relationship-analytics'
import { computeSessionStats } from './session-analytics'

const STOP_WORDS_RU = new Set([
  '\u0438',
  '\u0432',
  '\u043d\u0435',
  '\u043d\u0430',
  '\u044f',
  '\u0447\u0442\u043e',
  '\u0442\u043e\u0442',
  '\u044d\u0442\u043e',
  '\u0441',
  '\u043e\u043d',
  '\u043a\u0430\u043a',
  '\u043f\u043e',
  '\u043d\u043e',
  '\u043e\u043d\u0438',
  '\u043a',
  '\u0438\u0437',
  '\u0443',
  '\u0437\u0430',
  '\u0442\u043e',
  '\u0436\u0435',
  '\u043e\u0442',
  '\u0442\u0430\u043a',
  '\u0430',
  '\u0434\u0430',
  '\u043d\u0443',
  '\u0432\u043e\u0442',
  '\u0443\u0436\u0435',
  '\u0435\u0449\u0451',
  '\u0435\u0449\u0435',
  '\u0431\u044b',
  '\u043b\u0438',
  '\u0434\u043e',
  '\u0441\u043e',
  '\u043c\u043d\u0435',
  '\u0442\u044b',
  '\u043c\u044b',
  '\u0432\u044b',
  '\u043e\u043d\u0430',
  '\u043e\u043d\u043e',
  '\u043e\u0431',
  '\u0435\u0451',
  '\u0435\u0435',
  '\u0435\u0433\u043e',
  '\u0438\u0445',
  '\u0435\u0439',
  '\u0438\u043c',
  '\u043d\u0430\u0441',
  '\u0432\u0430\u0441',
  '\u043d\u0435\u0442',
  '\u0431\u044b\u043b',
  '\u0431\u044b\u043b\u0430',
  '\u0431\u044b\u043b\u0438',
  '\u0431\u044b\u0442\u044c',
  '\u0435\u0441\u0442\u044c',
  '\u0431\u0443\u0434\u0443',
  '\u0432\u0441\u0451',
  '\u0432\u0441\u0435',
  '\u0438\u043b\u0438',
  '\u0435\u0441\u043b\u0438',
  '\u043a\u043e\u0433\u0434\u0430',
  '\u0447\u0442\u043e\u0431\u044b',
  '\u043f\u043e\u0442\u043e\u043c\u0443',
  '\u044d\u0442\u043e\u0442',
  '\u044d\u0442\u0430',
  '\u044d\u0442\u0438',
  '\u043f\u0440\u0438',
  '\u0431\u0435\u0437',
  '\u043f\u043e\u0434',
  '\u043d\u0430\u0434',
  '\u0434\u043b\u044f',
  '\u043f\u0440\u043e',
  '\u043c\u0435\u043d\u044f',
  '\u0442\u0435\u0431\u044f',
  '\u043d\u0435\u0433\u043e',
  '\u043d\u0435\u0451',
  '\u043d\u0435\u0435',
  '\u043d\u0438\u0445',
  '\u0441\u0435\u0431\u044f',
  '\u0442\u0430\u043c',
  '\u0442\u0443\u0442',
  '\u0433\u0434\u0435',
  '\u043a\u0443\u0434\u0430',
  '\u043c\u043e\u0439',
  '\u0442\u0432\u043e\u0439',
  '\u0441\u0432\u043e\u0439',
  '\u043d\u0430\u0448',
  '\u0432\u0430\u0448',
  '\u0447\u0435\u043c',
  '\u043c\u043e\u0436\u043d\u043e',
  '\u043d\u0430\u0434\u043e',
  '\u043d\u0443\u0436\u043d\u043e',
  '\u0442\u043e\u043b\u044c\u043a\u043e',
  '\u0432\u043e\u043e\u0431\u0449\u0435',
  '\u043f\u0440\u043e\u0441\u0442\u043e',
  '\u043e\u0447\u0435\u043d\u044c',
  '\u0442\u043e\u0436\u0435',
  '\u0437\u0430\u0442\u043e',
  '\u0445\u043e\u0442\u044f',
  '\u043f\u043e\u043a\u0430',
  '\u043f\u043e\u0442\u043e\u043c',
  '\u043f\u043e\u0441\u043b\u0435',
  '\u043f\u0435\u0440\u0435\u0434',
  '\u043c\u0435\u0436\u0434\u0443',
  '\u0447\u0435\u0440\u0435\u0437',
  '\u0437\u0434\u0435\u0441\u044c',
  '\u0442\u0443\u0434\u0430',
  '\u043e\u0442\u0442\u0443\u0434\u0430',
  '\u0432\u0435\u0434\u044c',
  '\u0434\u0430\u0436\u0435',
  '\u043b\u0438\u0448\u044c',
  '\u0438\u043c\u0435\u043d\u043d\u043e',
  '\u0440\u0430\u0437\u0432\u0435',
  '\u043d\u0435\u0443\u0436\u0435\u043b\u0438',
  '\u0432\u0434\u0440\u0443\u0433',
])
const STOP_WORDS_EN = new Set([
  'i',
  'me',
  'my',
  'myself',
  'we',
  'our',
  'you',
  'your',
  'he',
  'him',
  'his',
  'she',
  'her',
  'it',
  'its',
  'they',
  'them',
  'their',
  'what',
  'which',
  'who',
  'this',
  'that',
  'these',
  'those',
  'am',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'shall',
  'can',
  'need',
  'dare',
  'ought',
  'used',
  'to',
  'of',
  'in',
  'for',
  'on',
  'with',
  'at',
  'by',
  'from',
  'as',
  'an',
  'the',
  'and',
  'but',
  'or',
  'nor',
  'so',
  'yet',
  'both',
  'either',
  'not',
  'no',
  'if',
  'then',
  'than',
  'too',
  'very',
  'just',
  'because',
  'while',
  'although',
  'though',
  'since',
  'until',
  'unless',
  'also',
  'about',
  'up',
  'out',
  'into',
  'over',
  'after',
  'before',
  'between',
  'through',
  'ok',
  'okay',
  'yes',
  'yeah',
  'yep',
  'nope',
  'hey',
  'hi',
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
    weekdayActivity: Object.fromEntries(
      Array.from({ length: 7 }, (_, index) => [String(index), createDirectionalCount()]),
    ),
    monthlyActivity: new Map(),
    hourlyActivitySplit: Object.fromEntries(
      Array.from({ length: 24 }, (_, index) => [String(index), createDirectionalCount()]),
    ),
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
  if (
    /^user unknown$/i.test(normalized) ||
    /^unknown$/i.test(normalized) ||
    /^unknown participant$/i.test(normalized)
  ) {
    return 'Name unavailable'
  }
  return normalized
}

export function aggregateMessage(message: AggregationMessageInput, acc: ReturnType<typeof createChatAccumulator>) {
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
  const weekdayActivity = acc.weekdayActivity[weekday]
  if (weekdayActivity) {
    incrementDirectional(weekdayActivity, outgoing)
  }

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
  if (text.trim().length > 0) {
    acc.textMessageCount += 1
    if (outgoing) {
      acc.mineTextMessages += 1
    } else {
      acc.theirsTextMessages += 1
    }
  }

  const textAnalysis = analyzeMessageText(text, stopWords)
  acc.totalWords += textAnalysis.wordCount
  if (outgoing) {
    acc.mineWords += textAnalysis.wordCount
  } else {
    acc.theirsWords += textAnalysis.wordCount
  }
  participant.messageCount += 1
  participant.wordCount += textAnalysis.wordCount
  if (!participant.firstSeen || timestamp < participant.firstSeen) {
    participant.firstSeen = timestamp
  }
  if (!participant.lastSeen || timestamp > participant.lastSeen) {
    participant.lastSeen = timestamp
  }
  for (const normalized of textAnalysis.keywords) {
    acc.wordCounts.set(normalized, (acc.wordCounts.get(normalized) ?? 0) + 1)
    participant.wordCounts.set(normalized, (participant.wordCounts.get(normalized) ?? 0) + 1)
    const directionalWords = outgoing ? acc.mineWordCounts : acc.theirsWordCounts
    directionalWords.set(normalized, (directionalWords.get(normalized) ?? 0) + 1)
  }

  for (const item of textAnalysis.emojis) {
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
  const timelineAnalytics = computeConversationTimelineAnalytics(timeline, privateLike)
  const { longestGap, silencePeriodsOver30Days } = timelineAnalytics
  acc.responseStats = timelineAnalytics.responseStats
  acc.averageMyResponseSec = timelineAnalytics.averageMyResponseSec
  acc.medianMyResponseSec = timelineAnalytics.medianMyResponseSec
  acc.medianTheirResponseSec = timelineAnalytics.medianTheirResponseSec
  acc.iWriteFirstPct = timelineAnalytics.iWriteFirstPct
  acc.responseRate = timelineAnalytics.responseRate

  const dailyRows = mapDailyActivity(acc.dailyActivity)
  const mostActiveDate = dailyRows.length ? [...dailyRows].sort((left, right) => right.total - left.total)[0] : null
  const monthlyRows = mapMonthlyActivity(acc.monthlyActivity)
  const mostActiveMonth = monthlyRows.length
    ? ([...monthlyRows].sort((left, right) => right.total - left.total)[0]?.month ?? null)
    : null
  const activeDays = dailyRows.length
  const maxStreak = computeMaxStreak(Array.from(acc.dailyActivity.keys()))
  const trend = computeTrend(monthlyRows)
  const sessionStats = computeSessionStats(timeline, activeDays, acc.timeZone)
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
  const insights = generateConversationInsights({
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
  return computeGroupReportAnalytics({
    totalMessages: acc.totalMessages,
    mediaCount: acc.mediaCount,
    voiceCount: acc.voiceCount,
    stickerCount: acc.stickerCount,
    fileCount: acc.fileCount,
    firstMessageAt: acc.firstMessageAt,
    lastMessageAt: acc.lastMessageAt,
    timeZone: acc.timeZone,
    activeDays,
    now: new Date(),
    wordCounts: acc.wordCounts,
    messageIndex: acc.messageIndex,
    timeline,
    participants: Array.from(acc.participants.values()),
  })
}

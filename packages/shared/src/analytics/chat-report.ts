import {
  CHAT_REPORT_VERSION,
  type ChatReport,
  type ChatType,
  type DirectionalCountDto,
  type MessageCompositionDto,
} from '../api/types'
import { computeMaxStreak, computeTrend, countActiveWeeks } from './activity'
import { computeGroupReport, type GroupParticipantInput, type GroupTimelineEntry } from './group-report'
import { addDirectional, createDirectionalCount, increment, roundTo, topItems } from './primitives'
import { computeHealthScore, computeRelationshipScore } from './relationship'
import { analyzeMessageText } from './text'
import { computeGaps, computeResponseStats, computeSessionStats, emptySessionStats } from './timeline'
import { createZonedClock, resolveTimeZone, type ZonedClock } from './zoned-clock'

/** Metadata of one Telegram message. The text is analysed in memory and never stored. */
export interface MessageInput {
  id: string
  date: Date
  outgoing: boolean
  text: string
  senderId: string | null
  senderName: string | null
  replyToId: string | null
  kind: keyof MessageCompositionDto
}

interface ParticipantState extends GroupParticipantInput {
  activeDays: Set<string>
  wordCounts: Map<string, number>
  emojiCounts: Map<string, number>
}

interface TimelineEntry extends GroupTimelineEntry {
  outgoing: boolean
}

interface DirectionalCounts {
  all: Map<string, number>
  mine: Map<string, number>
  theirs: Map<string, number>
}

const createDirectionalCounts = (): DirectionalCounts => ({ all: new Map(), mine: new Map(), theirs: new Map() })

function recordDirectional(counts: DirectionalCounts, key: string, outgoing: boolean) {
  increment(counts.all, key)
  increment(outgoing ? counts.mine : counts.theirs, key)
}

const SELF_ID = 'self'
const UNKNOWN_ID = 'unknown'

/**
 * Streaming aggregator for one chat. Feed messages with {@link add} in any
 * order, then call {@link finish} once to build the persisted report.
 */
export class ChatReportBuilder {
  readonly timeZone: string
  private readonly clock: ZonedClock

  private totals = { messages: 0, sent: 0, received: 0, chars: 0, words: 0, textMessages: 0 }
  private composition: MessageCompositionDto = { text: 0, media: 0, voice: 0, sticker: 0, file: 0 }
  private firstMessageAt: number | null = null
  private lastMessageAt: number | null = null
  private hourly = Array.from({ length: 24 }, createDirectionalCount)
  private weekday = Array.from({ length: 7 }, createDirectionalCount)
  private daily = new Map<string, DirectionalCountDto>()
  private monthly = new Map<string, DirectionalCountDto>()
  private words = createDirectionalCounts()
  private emoji = createDirectionalCounts()
  private textMessagesBySide = { mine: 0, theirs: 0 }
  private wordsBySide = { mine: 0, theirs: 0 }
  private participants = new Map<string, ParticipantState>()
  private timeline: TimelineEntry[] = []
  private messageSenders = new Map<string, string>()

  constructor(timeZone = 'UTC') {
    this.timeZone = resolveTimeZone(timeZone)
    this.clock = createZonedClock(this.timeZone)
  }

  get messageCount() {
    return this.totals.messages
  }

  add(message: MessageInput) {
    const ts = message.date.getTime()
    if (!Number.isFinite(ts)) return

    const { outgoing } = message
    const local = this.clock(ts)
    const participant = this.participant(message)

    this.totals.messages += 1
    if (outgoing) this.totals.sent += 1
    else this.totals.received += 1
    this.composition[message.kind] += 1

    addDirectional(this.hourly[local.hour]!, outgoing)
    addDirectional(this.weekday[local.weekday]!, outgoing)
    addDirectional(getOrCreate(this.daily, local.day), outgoing)
    addDirectional(getOrCreate(this.monthly, local.month), outgoing)

    if (this.firstMessageAt === null || ts < this.firstMessageAt) this.firstMessageAt = ts
    if (this.lastMessageAt === null || ts > this.lastMessageAt) this.lastMessageAt = ts

    this.timeline.push({ id: message.id, ts, outgoing, senderId: participant.id, replyToId: message.replyToId })
    this.messageSenders.set(message.id, participant.id)

    participant.messageCount += 1
    participant.activeDays.add(local.day)
    if (participant.firstSeen === null || ts < participant.firstSeen) participant.firstSeen = ts
    if (participant.lastSeen === null || ts > participant.lastSeen) participant.lastSeen = ts
    if (message.kind !== 'text') participant.mediaCount += 1

    const text = message.text
    this.totals.chars += text.length
    if (text.trim()) {
      this.totals.textMessages += 1
      participant.textMessageCount += 1
      this.textMessagesBySide[outgoing ? 'mine' : 'theirs'] += 1
    }

    const analysis = analyzeMessageText(text)
    this.totals.words += analysis.wordCount
    this.wordsBySide[outgoing ? 'mine' : 'theirs'] += analysis.wordCount
    participant.wordCount += analysis.wordCount
    for (const word of analysis.keywords) {
      recordDirectional(this.words, word, outgoing)
      increment(participant.wordCounts, word)
    }
    for (const symbol of analysis.emojis) {
      recordDirectional(this.emoji, symbol, outgoing)
      increment(participant.emojiCounts, symbol)
    }
  }

  finish(chatType: ChatType, now = new Date()): ChatReport {
    const timeline = this.timeline.sort((left, right) => left.ts - right.ts)
    const isPrivate = chatType === 'private'
    const daily = mapEntries(this.daily, 'date')
    const monthly = mapEntries(this.monthly, 'month')
    const activeDays = daily.length
    const maxStreak = computeMaxStreak(this.daily.keys())
    const trend = computeTrend(monthly, this.clock(now.getTime()).month)
    const gaps = computeGaps(timeline)
    const sessions = computeSessionStats(timeline, countActiveWeeks(this.daily.keys()), (ts) => this.clock(ts).hour)
    const responses = computeResponseStats(isPrivate ? timeline : [])

    const relationship = isPrivate
      ? computeRelationshipScore({
          sentMessages: this.totals.sent,
          receivedMessages: this.totals.received,
          responses,
          activeDays,
          maxStreakDays: maxStreak.days,
          trend,
        })
      : null
    const mostActiveDate = daily.reduce<(typeof daily)[number] | null>(
      (best, day) => (!best || day.total > best.total ? day : best),
      null,
    )
    const mostActiveMonth = monthly.reduce<(typeof monthly)[number] | null>(
      (best, month) => (!best || month.total > best.total ? month : best),
      null,
    )

    return {
      version: CHAT_REPORT_VERSION,
      timeZone: this.timeZone,
      totals: { ...this.totals },
      composition: { ...this.composition },
      period: {
        firstMessageAt: this.firstMessageAt === null ? null : new Date(this.firstMessageAt).toISOString(),
        lastMessageAt: this.lastMessageAt === null ? null : new Date(this.lastMessageAt).toISOString(),
      },
      activity: { hourly: this.hourly, weekday: this.weekday, daily, monthly },
      vocabulary: {
        topWords: topItems(this.words.all),
        topWordsBySender: { mine: topItems(this.words.mine), theirs: topItems(this.words.theirs) },
        uniqueWordsBySender: {
          mine: topItems(exclusive(this.words.mine, this.words.theirs)),
          theirs: topItems(exclusive(this.words.theirs, this.words.mine)),
        },
        topEmoji: topItems(this.emoji.all),
        topEmojiBySender: { mine: topItems(this.emoji.mine), theirs: topItems(this.emoji.theirs) },
        wordsPerMessage: {
          mine: ratio(this.wordsBySide.mine, this.textMessagesBySide.mine),
          theirs: ratio(this.wordsBySide.theirs, this.textMessagesBySide.theirs),
        },
      },
      responses,
      facts: {
        activeDays,
        longestGap: gaps.longestGap,
        mostActiveDate: mostActiveDate ? { date: mostActiveDate.date, total: mostActiveDate.total } : null,
        maxStreak,
        silencesOver30Days: gaps.silencesOver30Days,
        trend,
        mostActiveMonth: mostActiveMonth?.month ?? null,
      },
      sessions: timeline.length ? sessions : emptySessionStats(),
      relationship,
      health: computeHealthScore({
        responseRate: responses.responseRate,
        sessions,
        activeDays,
        relationship,
        trend,
      }),
      group:
        chatType === 'group'
          ? computeGroupReport({
              totalMessages: this.totals.messages,
              nonTextMessages: this.totals.messages - this.composition.text,
              firstMessageAt: this.firstMessageAt,
              lastMessageAt: this.lastMessageAt,
              activeDays,
              now: now.getTime(),
              clock: this.clock,
              wordCounts: this.words.all,
              timeline,
              messageSenders: this.messageSenders,
              participants: [...this.participants.values()],
            })
          : null,
    }
  }

  private participant(message: MessageInput): ParticipantState {
    const id = message.senderId?.trim() || (message.outgoing ? SELF_ID : UNKNOWN_ID)
    const name = message.senderName?.trim() || null
    const existing = this.participants.get(id)
    if (existing) {
      if (name) existing.name = name
      if (message.outgoing) existing.isSelf = true
      return existing
    }

    const created: ParticipantState = {
      id,
      // Unknown names stay empty; the UI shows a localised placeholder.
      name: name ?? '',
      isSelf: message.outgoing,
      messageCount: 0,
      textMessageCount: 0,
      wordCount: 0,
      mediaCount: 0,
      activeDays: new Set(),
      firstSeen: null,
      lastSeen: null,
      wordCounts: new Map(),
      emojiCounts: new Map(),
    }
    this.participants.set(id, created)
    return created
  }
}

function getOrCreate(map: Map<string, DirectionalCountDto>, key: string) {
  let value = map.get(key)
  if (!value) map.set(key, (value = createDirectionalCount()))
  return value
}

function mapEntries<K extends 'date' | 'month'>(map: ReadonlyMap<string, DirectionalCountDto>, key: K) {
  return [...map.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([value, counts]) => ({ [key]: value, ...counts }) as DirectionalCountDto & Record<K, string>)
}

function exclusive(source: ReadonlyMap<string, number>, other: ReadonlyMap<string, number>) {
  return new Map([...source].filter(([word]) => !other.has(word)))
}

function ratio(value: number, total: number) {
  return total ? roundTo(value / total, 2) : null
}

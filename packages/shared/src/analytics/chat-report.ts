import {
  CHAT_REPORT_VERSION,
  type ChatReport,
  type ChatType,
  type DirectionalCountDto,
  type GroupReportDto,
  type MessageCompositionDto,
  type MilestoneDto,
  type MilestoneKind,
  type RecordingStatsDto,
  type RitualsDto,
  type SideCountDto,
  type StickerStatsDto,
  type TopItemDto,
} from '../api/types'
import { computeMaxStreak, computeTrend, countActiveWeeks } from './activity'
import { computeGroupReport, type GroupParticipantInput, type GroupTimelineEntry } from './group-report'
import { addDirectional, createDirectionalCount, increment, roundTo, topItems } from './primitives'
import { computeHealthScore, computeRelationshipScore } from './relationship'
import { stemWord } from './stem'
import { analyzeMessageText, normalizeEmoji, STOP_LEMMAS } from './text'
import {
  computeGaps,
  computeHabits,
  computeResponseStats,
  computeSessionStats,
  computeUnansweredQuestions,
  emptySessionStats,
  OVERNIGHT_BOUNDARY_MS,
  sessionSplit,
} from './timeline'
import { createZonedClock, resolveTimeZone, type ZonedClock } from './zoned-clock'

/** A dictionary infinitive («говорить», «смеяться», «идти»), not a Snowball stem. */
const INFINITIVE = /(?:ть|ться|ти|тись|чь|чься)$/u

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
  /** Length of a voice message or video note, in seconds. */
  durationSec?: number | null
  /** A video note («кружочек»); its `kind` is `media`. */
  round?: boolean
  /** Reactions under the message, by emoji. */
  reactions?: ReactionInput[]
  sticker?: StickerInput | null
}

export interface ReactionInput {
  /** The emoji, or `custom` for a custom emoji and `paid` for stars. */
  emoji: string
  count: number
  /** The current user put this reaction. */
  mine: boolean
}

export interface StickerInput {
  id: string
  emoji: string | null
  setId: string | null
}

/** Message numbers worth a moment: the first one, the 1000th, the 10 000th… */
export const MILESTONES = [1, 100, 1_000, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000]
/** Mornings open at 5:00 and end at noon; evenings run from 21:00 until 5:00. */
const MORNING_FROM = 5
const MORNING_UNTIL = 12
const EVENING_FROM = 21
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
/** A morning counts as a talk when the other side answers within this time. */
const MORNING_REPLY_MS = 4 * HOUR_MS
const TOP_STICKERS = 8

interface ParticipantState extends GroupParticipantInput {
  activeDays: Set<string>
  wordCounts: Map<string, number>
  emojiCounts: Map<string, number>
  voiceSeconds: number
  roundSeconds: number
  stickerCount: number
  reactionsReceived: number
  greetings: number
  morningFirst: number
  nightLast: number
}

interface TimelineEntry extends GroupTimelineEntry {
  outgoing: boolean
  asks: boolean
  /** The other side reacted to the message. */
  reacted: boolean
  /** What the message was, for milestones; never its text. */
  kind: MilestoneKind
  words: number
  emoji: string | null
  durationSec: number | null
}

interface StickerState {
  emoji: string | null
  setId: string | null
  mine: number
  theirs: number
  messageId: string
}

const sideCount = (): SideCountDto => ({ mine: 0, theirs: 0 })
const emptyRecording = (): RecordingStatsDto => ({ count: sideCount(), seconds: sideCount(), longest: null })

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
 * Groups word forms under one key, or returns null for words that carry no
 * topic (pronouns, prepositions…). The default stems with Snowball; the
 * worker plugs in a dictionary lemmatizer.
 */
export type WordKey = (word: string) => string | null

export interface ChatReportOptions {
  wordKey?: WordKey
}

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
  private questions = { mine: 0, theirs: 0 }
  private laughs = { mine: 0, theirs: 0 }
  private participants = new Map<string, ParticipantState>()
  /** Written forms of each word stem, to show the most common one. */
  private wordForms = new Map<string, Map<string, number>>()
  private voice = { voice: emptyRecording(), round: emptyRecording() }
  private reactions = {
    given: sideCount(),
    received: sideCount(),
    reactedMessages: sideCount(),
    emoji: createDirectionalCounts(),
  }
  private stickers = new Map<string, StickerState>()
  private greetings = { morning: sideCount(), night: sideCount() }
  private timeline: TimelineEntry[] = []
  private messageSenders = new Map<string, string>()

  private readonly wordKey: WordKey

  constructor(timeZone = 'UTC', options: ChatReportOptions = {}) {
    this.wordKey = options.wordKey ?? stemWord
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

    const analysis = analyzeMessageText(message.text)
    this.timeline.push({
      id: message.id,
      ts,
      outgoing,
      senderId: participant.id,
      replyToId: message.replyToId,
      asks: analysis.asks,
      reacted: reactedByOtherSide(message),
      kind: message.round ? 'round' : message.kind,
      words: analysis.wordCount,
      emoji: message.sticker?.emoji ?? null,
      durationSec: message.durationSec ?? null,
    })
    this.messageSenders.set(message.id, participant.id)
    this.addExtras(message, participant, analysis.greeting)

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

    this.totals.words += analysis.wordCount
    const side = outgoing ? 'mine' : 'theirs'
    this.wordsBySide[side] += analysis.wordCount
    if (analysis.asks) this.questions[side] += 1
    if (analysis.laughs) this.laughs[side] += 1
    participant.wordCount += analysis.wordCount
    for (const word of analysis.keywords) {
      const stem = this.wordKey(word)
      if (stem === null || STOP_LEMMAS.has(stem)) continue
      let forms = this.wordForms.get(stem)
      if (!forms) this.wordForms.set(stem, (forms = new Map()))
      increment(forms, word)
      recordDirectional(this.words, stem, outgoing)
      increment(participant.wordCounts, stem)
    }
    for (const symbol of analysis.emojis) {
      recordDirectional(this.emoji, symbol, outgoing)
      increment(participant.emojiCounts, symbol)
    }
  }

  private addExtras(message: MessageInput, participant: ParticipantState, greeting: 'morning' | 'night' | null) {
    const side = message.outgoing ? 'mine' : 'theirs'

    if (greeting) {
      this.greetings[greeting][side] += 1
      participant.greetings += 1
    }

    const recording = message.round ? this.voice.round : message.kind === 'voice' ? this.voice.voice : null
    if (recording) {
      const seconds = Math.max(0, Math.round(message.durationSec ?? 0))
      recording.count[side] += 1
      recording.seconds[side] += seconds
      if (message.round) participant.roundSeconds += seconds
      else participant.voiceSeconds += seconds
      const longest = recording.longest
      // Of two equally long ones the earlier counts, whatever order they arrive in.
      if (
        seconds > 0 &&
        (!longest ||
          seconds > longest.seconds ||
          (seconds === longest.seconds && message.date.getTime() < Date.parse(longest.at)))
      ) {
        recording.longest = {
          seconds,
          mine: message.outgoing,
          at: message.date.toISOString(),
          senderId: participant.id,
        }
      }
    }

    if (message.reactions?.length) {
      let total = 0
      for (const reaction of message.reactions) {
        const count = Math.max(0, Math.floor(reaction.count))
        if (!count) continue
        const mine = reaction.mine ? 1 : 0
        // A reaction under your own message is not a reaction you received.
        total += message.outgoing ? count - mine : count
        const theirs = count - mine
        this.reactions.given.mine += mine
        this.reactions.given.theirs += theirs
        const emoji =
          reaction.emoji === 'custom' || reaction.emoji === 'paid' ? reaction.emoji : normalizeEmoji(reaction.emoji)
        if (mine) recordDirectional(this.reactions.emoji, emoji, true)
        if (theirs) {
          increment(this.reactions.emoji.all, emoji, theirs)
          increment(this.reactions.emoji.theirs, emoji, theirs)
        }
      }
      if (total) {
        this.reactions.received[side] += total
        this.reactions.reactedMessages[side] += 1
        participant.reactionsReceived += total
      }
    }

    if (message.kind === 'sticker') {
      participant.stickerCount += 1
      const sticker = message.sticker
      if (sticker?.id) {
        let state = this.stickers.get(sticker.id)
        if (!state) {
          state = { emoji: sticker.emoji, setId: sticker.setId, mine: 0, theirs: 0, messageId: message.id }
          this.stickers.set(sticker.id, state)
        }
        state[side] += 1
      }
    }
  }

  /** The most used stickers with one message that shows each, to fetch previews. */
  topStickers(limit = TOP_STICKERS): { id: string; messageId: string }[] {
    return [...this.stickers.entries()]
      .sort(
        ([leftId, left], [rightId, right]) =>
          right.mine + right.theirs - (left.mine + left.theirs) || leftId.localeCompare(rightId),
      )
      .slice(0, limit)
      .map(([id, state]) => ({ id, messageId: state.messageId }))
  }

  /**
   * Shows a word stem as its most common written form; a verb shows as its
   * infinitive, so «говорю», «сказала» and «видел» read as one word each.
   */
  private formOf = (stem: string) => {
    const forms = this.wordForms.get(stem)
    if (!forms) return stem
    if (INFINITIVE.test(stem) && forms.size > 1) return stem
    let best = stem
    let bestCount = -1
    for (const [form, count] of forms) {
      if (count > bestCount || (count === bestCount && form < best)) {
        best = form
        bestCount = count
      }
    }
    return best
  }

  private words20 = (counts: ReadonlyMap<string, number>, limit = 20): TopItemDto[] =>
    topItems(counts, limit).map((item) => ({ value: this.formOf(item.value), count: item.count }))

  finish(chatType: ChatType, now = new Date()): ChatReport {
    const timeline = this.timeline.sort(byTimeThenId)
    const isPrivate = chatType === 'private'
    const daily = mapEntries(this.daily, 'date')
    const monthly = mapEntries(this.monthly, 'month')
    const activeDays = daily.length
    const maxStreak = computeMaxStreak(this.daily.keys())
    const trend = computeTrend(monthly, this.clock(now.getTime()).month)
    const gaps = computeGaps(timeline)
    const split = sessionSplit((ts) => this.clock(ts).day)
    const sessions = computeSessionStats(
      timeline,
      countActiveWeeks(this.daily.keys()),
      (ts) => this.clock(ts).hour,
      split,
    )
    const responses = computeResponseStats(isPrivate ? timeline : [], split)
    // Before the group report, which reads the per-member counts.
    const rituals = this.computeRituals(timeline)

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
        topWords: this.words20(this.words.all),
        topWordsBySender: { mine: this.words20(this.words.mine), theirs: this.words20(this.words.theirs) },
        uniqueWordsBySender: {
          mine: this.words20(exclusive(this.words.mine, this.words.theirs)),
          theirs: this.words20(exclusive(this.words.theirs, this.words.mine)),
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
      habits: isPrivate
        ? {
            ...computeHabits(timeline, { questions: this.questions, laughs: this.laughs }, split),
            ...computeUnansweredQuestions(timeline),
          }
        : null,
      group:
        chatType === 'group'
          ? this.withWordForms(
              computeGroupReport({
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
              }),
            )
          : null,
      voice: { voice: this.voice.voice, round: this.voice.round },
      reactions: {
        given: this.reactions.given,
        received: this.reactions.received,
        reactedMessages: this.reactions.reactedMessages,
        topBySender: { mine: topItems(this.reactions.emoji.mine, 8), theirs: topItems(this.reactions.emoji.theirs, 8) },
        top: topItems(this.reactions.emoji.all, 8),
      },
      stickers: this.stickerStats(),
      milestones: computeMilestones(timeline),
      rituals,
    }
  }

  private stickerStats(): StickerStatsDto {
    const count = sideCount()
    const packs = new Set<string>()
    for (const state of this.stickers.values()) if (state.setId) packs.add(state.setId)
    for (const participant of this.participants.values()) {
      count[participant.isSelf ? 'mine' : 'theirs'] += participant.stickerCount
    }
    return {
      count,
      distinct: this.stickers.size,
      packs: packs.size,
      top: this.topStickers().map(({ id }) => {
        const state = this.stickers.get(id)!
        return { id, emoji: state.emoji, mine: state.mine, theirs: state.theirs, thumb: null }
      }),
    }
  }

  /** Group word lists are counted by stem; show them as written. */
  private withWordForms(group: GroupReportDto): GroupReportDto {
    const show = (items: TopItemDto[]) => items.map((item) => ({ ...item, value: this.formOf(item.value) }))
    const extras = new Map([...this.participants.values()].map((participant) => [participant.id, participant]))
    return {
      ...group,
      sharedVocabulary: show(group.sharedVocabulary),
      uniqueGroupWords: show(group.uniqueGroupWords),
      participants: group.participants.map((participant) => {
        const state = extras.get(participant.id)
        return {
          ...participant,
          topWords: show(participant.topWords),
          topicSignature: show(participant.topicSignature),
          voiceSeconds: state?.voiceSeconds ?? 0,
          roundSeconds: state?.roundSeconds ?? 0,
          stickerCount: state?.stickerCount ?? 0,
          reactionsReceived: state?.reactionsReceived ?? 0,
          morningFirst: state?.morningFirst ?? 0,
          nightLast: state?.nightLast ?? 0,
          greetings: state?.greetings ?? 0,
        }
      }),
    }
  }

  /** Who opens the mornings and who closes the evenings; see {@link RitualsDto}. */
  private computeRituals(timeline: readonly TimelineEntry[]): RitualsDto {
    const firstOfDay = new Map<string, number>()
    const evenings = new Map<string, { last: TimelineEntry; senders: Set<string> }>()
    timeline.forEach((entry, index) => {
      const local = this.clock(entry.ts)
      if (local.hour >= MORNING_FROM && !firstOfDay.has(local.day)) firstOfDay.set(local.day, index)
      if (local.hour >= EVENING_FROM || local.hour < MORNING_FROM) {
        // The small hours belong to the evening that began the day before.
        const key = local.hour < MORNING_FROM ? previousDay(local.day) : local.day
        let evening = evenings.get(key)
        if (!evening) evenings.set(key, (evening = { last: entry, senders: new Set() }))
        evening.last = entry
        evening.senders.add(entry.senderId)
      }
    })

    const rituals: RitualsDto = {
      mornings: 0,
      morningFirst: sideCount(),
      evenings: 0,
      nightLast: sideCount(),
      goodMorning: { ...this.greetings.morning },
      goodNight: { ...this.greetings.night },
    }
    for (const [day, index] of firstOfDay) {
      const entry = timeline[index]!
      if (this.clock(entry.ts).hour >= MORNING_UNTIL) continue
      // Still chatting from the night: nobody opened this morning.
      const before = timeline[index - 1]
      if (before && entry.ts - before.ts < OVERNIGHT_BOUNDARY_MS) continue
      if (!this.answeredSameMorning(timeline, index, day)) continue
      rituals.mornings += 1
      rituals.morningFirst[entry.outgoing ? 'mine' : 'theirs'] += 1
      const participant = this.participants.get(entry.senderId)
      if (participant) participant.morningFirst += 1
    }
    for (const { last, senders } of evenings.values()) {
      // Someone talking alone closes nothing.
      if (senders.size < 2) continue
      rituals.evenings += 1
      rituals.nightLast[last.outgoing ? 'mine' : 'theirs'] += 1
      const participant = this.participants.get(last.senderId)
      if (participant) participant.nightLast += 1
    }
    return rituals
  }

  /** Someone else wrote the same day, soon after the opening message. */
  private answeredSameMorning(timeline: readonly TimelineEntry[], index: number, day: string) {
    const opener = timeline[index]!
    for (let next = index + 1; next < timeline.length; next += 1) {
      const entry = timeline[next]!
      if (entry.ts - opener.ts > MORNING_REPLY_MS || this.clock(entry.ts).day !== day) return false
      if (entry.senderId !== opener.senderId) return true
    }
    return false
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
      voiceSeconds: 0,
      roundSeconds: 0,
      stickerCount: 0,
      reactionsReceived: 0,
      greetings: 0,
      morningFirst: 0,
      nightLast: 0,
    }
    this.participants.set(id, created)
    return created
  }
}

export function computeMilestones(timeline: readonly TimelineEntry[]): MilestoneDto[] {
  return MILESTONES.filter((index) => index <= timeline.length).map((index) => {
    const entry = timeline[index - 1]!
    return {
      index,
      at: new Date(entry.ts).toISOString(),
      mine: entry.outgoing,
      senderId: entry.senderId,
      messageId: entry.id,
      kind: entry.kind,
      words: entry.words,
      emoji: entry.emoji,
      durationSec: entry.durationSec,
    }
  })
}

function previousDay(day: string) {
  return new Date(Date.parse(`${day}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10)
}

/** Telegram dates have one-second resolution, so messages sent together are ordered by id. */
function byTimeThenId(left: { ts: number; id: string }, right: { ts: number; id: string }) {
  if (left.ts !== right.ts) return left.ts - right.ts
  const numeric = /^\d+$/
  if (!numeric.test(left.id) || !numeric.test(right.id)) return 0
  return left.id.length - right.id.length || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
}

/** The other side put a reaction under the message: a quiet answer. */
function reactedByOtherSide(message: MessageInput) {
  return (message.reactions ?? []).some((reaction) =>
    message.outgoing ? reaction.count > (reaction.mine ? 1 : 0) : reaction.mine,
  )
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

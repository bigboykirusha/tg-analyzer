import type {
  GroupHealthDto,
  GroupMemberRole,
  GroupPairDto,
  GroupParticipantDto,
  GroupReportDto,
  TopItemDto,
} from '../api/types'
import { calculateAverage, increment, roundTo, topItems } from './primitives'
import type { ZonedClock } from './zoned-clock'

export interface GroupParticipantInput {
  id: string
  name: string
  isSelf: boolean
  messageCount: number
  textMessageCount: number
  wordCount: number
  mediaCount: number
  activeDays: ReadonlySet<string>
  /** Epoch milliseconds. */
  firstSeen: number | null
  lastSeen: number | null
  wordCounts: ReadonlyMap<string, number>
  emojiCounts: ReadonlyMap<string, number>
}

export interface GroupTimelineEntry {
  id: string
  ts: number
  senderId: string
  replyToId: string | null
}

export interface GroupReportInput {
  totalMessages: number
  /** Messages that are not plain text (media, voice, stickers, files). */
  nonTextMessages: number
  firstMessageAt: number | null
  lastMessageAt: number | null
  activeDays: number
  now: number
  clock: ZonedClock
  wordCounts: ReadonlyMap<string, number>
  /** Chronological. */
  timeline: readonly GroupTimelineEntry[]
  /** Message id → sender id, used to resolve explicit replies. */
  messageSenders: ReadonlyMap<string, string>
  participants: readonly GroupParticipantInput[]
}

const DAY_MS = 24 * 60 * 60 * 1000
const GROUP_SESSION_BOUNDARY_MS = 4 * 60 * 60 * 1000
const IMPLIED_REPLY_WINDOW_MS = 10 * 60 * 1000
const RESPONSE_COVERAGE_WINDOW_MS = 30 * 60 * 1000
/** Retention is only meaningful for groups with at least this much history. */
export const GROUP_RETENTION_MIN_DAYS = 180

/**
 * Maps participant metrics to a product role. Legacy roles stored by older
 * versions (`ghost`, `lurker`, …) are understood when no activity data exists.
 */
export function resolveGroupRole(
  input: {
    role?: string | null
    messageShare?: number | null
    starterShare?: number | null
    firstSeen?: string | number | null
    lastSeen?: string | number | null
    messageCount?: number | null
  },
  now: number,
): GroupMemberRole {
  const toTime = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return null
    const time = typeof value === 'number' ? value : Date.parse(value)
    return Number.isFinite(time) ? time : null
  }
  const messageShare = input.messageShare ?? 0
  const starterShare = input.starterShare ?? 0
  const messageCount = input.messageCount ?? 0
  const firstSeen = toTime(input.firstSeen)
  const lastSeen = toTime(input.lastSeen)

  if (lastSeen !== null && (now - lastSeen) / DAY_MS > 90) return 'inactive'
  if (lastSeen === null && ['ghost', 'lurker', 'inactive'].includes(input.role ?? '')) return 'inactive'
  if (firstSeen !== null && (now - firstSeen) / DAY_MS <= 30 && messageShare < 2 && messageCount < 25) return 'newcomer'
  if (messageShare >= 15 || (messageShare >= 10 && starterShare >= 15) || messageCount >= 500) return 'anchor'
  return 'contributor'
}

export function hasSufficientGroupRetentionPeriod(first: number, last: number, clock: ZonedClock): boolean {
  return countCalendarDays(first, last, clock) >= GROUP_RETENTION_MIN_DAYS
}

function countCalendarDays(first: number, last: number, clock: ZonedClock) {
  if (!Number.isFinite(first) || !Number.isFinite(last) || last < first) return 0
  return Math.round((Date.parse(clock(last).day) - Date.parse(clock(first).day)) / DAY_MS) + 1
}

function dayAtOffset(day: string, offset: number): string {
  return new Date(Date.parse(`${day}T00:00:00.000Z`) + offset * DAY_MS).toISOString().slice(0, 10)
}

function hasActivityBetween(days: ReadonlySet<string>, start: string, end: string): boolean {
  for (const day of days) if (day >= start && day < end) return true
  return false
}

export function computeGroupReport(input: GroupReportInput): GroupReportDto {
  const { clock, timeline } = input
  const stats = new Map(
    input.participants.map((participant) => [participant.id, { starterCount: 0, replyCount: 0, repliesReceived: 0 }]),
  )
  const directPairs = new Map<string, number>()
  const impliedPairs = new Map<string, number>()
  const participantsPerHour = new Map<string, Set<string>>()
  let totalSessions = 0
  let turns = 0
  let answeredTurns = 0

  // Index of the first message of the next sender run, for reply coverage.
  const nextRunStart: Array<number | undefined> = new Array(timeline.length)
  for (let index = timeline.length - 1, upcoming: number | undefined; index >= 0; index -= 1) {
    const next = timeline[index + 1]
    if (next && next.senderId !== timeline[index]!.senderId) upcoming = index + 1
    nextRunStart[index] = upcoming
  }

  for (let index = 0; index < timeline.length; index += 1) {
    const current = timeline[index]!
    const sender = stats.get(current.senderId)
    if (!sender) continue

    const local = clock(current.ts)
    const hourKey = `${local.day}:${local.hour}`
    let hourParticipants = participantsPerHour.get(hourKey)
    if (!hourParticipants) participantsPerHour.set(hourKey, (hourParticipants = new Set()))
    hourParticipants.add(current.senderId)

    const previous = timeline[index - 1]
    if (!previous || current.ts - previous.ts > GROUP_SESSION_BOUNDARY_MS) {
      sender.starterCount += 1
      totalSessions += 1
    }

    if (current.replyToId) {
      const recipientId = input.messageSenders.get(current.replyToId)
      if (recipientId && recipientId !== current.senderId) {
        sender.replyCount += 1
        const recipient = stats.get(recipientId)
        if (recipient) recipient.repliesReceived += 1
        increment(directPairs, `${recipientId}|${current.senderId}`)
      }
    } else if (previous && previous.senderId !== current.senderId) {
      const gap = current.ts - previous.ts
      if (gap >= 0 && gap <= IMPLIED_REPLY_WINDOW_MS)
        increment(impliedPairs, `${previous.senderId}|${current.senderId}`)
    }

    const next = timeline[index + 1]
    if (!next || next.senderId !== current.senderId) {
      turns += 1
      const answerIndex = nextRunStart[index]
      const answer = answerIndex === undefined ? undefined : timeline[answerIndex]
      if (answer && answer.ts - current.ts >= 0 && answer.ts - current.ts <= RESPONSE_COVERAGE_WINDOW_MS) {
        answeredTurns += 1
      }
    }
  }

  const memberCount = input.participants.length
  const lastMessageAt = input.lastMessageAt ?? input.now
  const firstMessageAt = input.firstMessageAt ?? lastMessageAt
  const durationDays = Math.max(1, countCalendarDays(firstMessageAt, lastMessageAt, clock))

  // Vocabulary shared by at least half of the members vs. words used by a few.
  const wordPresence = new Map<string, number>()
  for (const participant of input.participants) {
    for (const word of participant.wordCounts.keys()) increment(wordPresence, word)
  }
  const sharedThreshold = Math.max(2, Math.ceil(memberCount * 0.5))
  const uniqueThreshold = Math.max(1, Math.floor(memberCount * 0.3))
  const sharedVocabulary = topItems(
    new Map([...input.wordCounts].filter(([word]) => (wordPresence.get(word) ?? 0) >= sharedThreshold)),
    15,
  )
  const uniqueGroupWords = topItems(
    new Map(
      [...input.wordCounts].filter(([word, count]) => count >= 3 && (wordPresence.get(word) ?? 0) <= uniqueThreshold),
    ),
    15,
  )

  // Momentum: active members in the chat's last 30 days vs. the 30 days before.
  // Measured from the last message, not from today: a report describes the chat
  // as it was, so a group that went quiet still shows who carried it.
  const today = clock(lastMessageAt).day
  const currentWindowStart = dayAtOffset(today, -29)
  const previousWindowStart = dayAtOffset(today, -59)
  const tomorrow = dayAtOffset(today, 1)
  const activeLast30Days = input.participants.filter((p) =>
    hasActivityBetween(p.activeDays, currentWindowStart, tomorrow),
  ).length
  const activePrevious30Days = input.participants.filter((p) =>
    hasActivityBetween(p.activeDays, previousWindowStart, currentWindowStart),
  ).length
  let momentum: GroupHealthDto['momentum'] = 'stable'
  if (clock(firstMessageAt).day > previousWindowStart || (activePrevious30Days === 0 && activeLast30Days === 0)) {
    momentum = 'unknown'
  } else if (activePrevious30Days === 0) {
    momentum = 'growing'
  } else if (activeLast30Days > activePrevious30Days * 1.15) {
    momentum = 'growing'
  } else if (activeLast30Days < activePrevious30Days * 0.85) {
    momentum = 'shrinking'
  }

  // Retention: members active in the first 90 days who are still active in the last 90 days.
  const earlyWindowEnd = dayAtOffset(clock(firstMessageAt).day, 89)
  const recentWindowStart = dayAtOffset(clock(lastMessageAt).day, -89)
  const early = input.participants.filter((p) => p.firstSeen !== null && clock(p.firstSeen).day <= earlyWindowEnd)
  const retained = early.filter((p) => p.lastSeen !== null && clock(p.lastSeen).day >= recentWindowStart).length
  const retentionRate =
    hasSufficientGroupRetentionPeriod(firstMessageAt, lastMessageAt, clock) && early.length
      ? roundTo((retained / early.length) * 100, 1)
      : null

  const halfway = firstMessageAt + (lastMessageAt - firstMessageAt) / 2
  const churnedMembers = input.participants.filter(
    (p) =>
      p.lastSeen !== null && clock(p.lastSeen).day < recentWindowStart && p.firstSeen !== null && p.firstSeen < halfway,
  ).length

  const shares = input.participants
    .map((p) => (input.totalMessages ? p.messageCount / input.totalMessages : 0))
    .sort((left, right) => left - right)
  const meanShare = calculateAverage(shares)
  const giniCoefficient =
    shares.length && meanShare
      ? roundTo(
          shares.reduce((sum, share, index) => sum + (2 * (index + 1) - shares.length - 1) * share, 0) /
            (shares.length * shares.length * meanShare),
          3,
        )
      : 0
  const lurkers = input.participants.filter((p) =>
    input.totalMessages ? (p.messageCount / input.totalMessages) * 100 < 0.5 : true,
  ).length

  const participants: GroupParticipantDto[] = input.participants
    .map((participant) => {
      const own = stats.get(participant.id)!
      const messageShare = input.totalMessages ? roundTo((participant.messageCount / input.totalMessages) * 100, 1) : 0
      const starterShare = totalSessions ? roundTo((own.starterCount / totalSessions) * 100, 1) : 0
      return {
        id: participant.id,
        name: participant.name,
        isSelf: participant.isSelf,
        role: resolveGroupRole(
          {
            messageShare,
            starterShare,
            firstSeen: participant.firstSeen,
            lastSeen: participant.lastSeen,
            messageCount: participant.messageCount,
          },
          lastMessageAt,
        ),
        messageCount: participant.messageCount,
        messageShare,
        wordCount: participant.wordCount,
        avgWordsPerMessage: participant.textMessageCount
          ? roundTo(participant.wordCount / participant.textMessageCount, 2)
          : null,
        mediaCount: participant.mediaCount,
        mediaShare: input.nonTextMessages ? roundTo((participant.mediaCount / input.nonTextMessages) * 100, 1) : 0,
        firstSeen: participant.firstSeen === null ? null : new Date(participant.firstSeen).toISOString(),
        lastSeen: participant.lastSeen === null ? null : new Date(participant.lastSeen).toISOString(),
        activeDays: participant.activeDays.size,
        consistencyScore: roundTo((participant.activeDays.size / durationDays) * 100, 1),
        starterCount: own.starterCount,
        starterShare,
        replyCount: own.replyCount,
        repliesReceived: own.repliesReceived,
        magnetScore: participant.messageCount ? roundTo(own.repliesReceived / participant.messageCount, 2) : null,
        replyRatio: participant.messageCount ? roundTo(own.replyCount / participant.messageCount, 2) : null,
        topWords: topItems(participant.wordCounts, 5),
        topEmoji: topItems(participant.emojiCounts, 5),
        topicSignature: computeTopicSignature(participant.wordCounts, input.wordCounts),
      }
    })
    .sort((left, right) => right.messageCount - left.messageCount)

  let peakSimultaneity = 0
  for (const set of participantsPerHour.values()) peakSimultaneity = Math.max(peakSimultaneity, set.size)

  return {
    participants,
    topPairs: buildTopPairs(participants, directPairs, impliedPairs),
    health:
      input.totalMessages > 0 && memberCount > 0
        ? {
            giniCoefficient,
            lurkerRatio: roundTo((lurkers / memberCount) * 100, 1),
            retentionRate,
            responseCoverage: turns ? roundTo((answeredTurns / turns) * 100, 1) : 0,
            consistency: roundTo((input.activeDays / durationDays) * 100, 1),
            momentum,
            activeMembers: memberCount,
            activeMembersLast30Days: activeLast30Days,
            churnedMembers,
            peakSimultaneity,
          }
        : null,
    sharedVocabulary,
    uniqueGroupWords,
  }
}

/** Words a participant uses noticeably more often than the group as a whole. */
function computeTopicSignature(own: ReadonlyMap<string, number>, all: ReadonlyMap<string, number>): TopItemDto[] {
  let ownTotal = 0
  for (const value of own.values()) ownTotal += value
  let allTotal = 0
  for (const value of all.values()) allTotal += value
  if (!ownTotal || !allTotal) return []

  return Array.from(own.entries())
    .map(([word, count]) => {
      const localShare = count / ownTotal
      const globalShare = (all.get(word) ?? count) / allTotal
      return { value: word, count: roundTo(localShare / Math.max(globalShare, 1 / allTotal), 2) }
    })
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
    .slice(0, 5)
}

function buildTopPairs(
  participants: readonly GroupParticipantDto[],
  directPairs: ReadonlyMap<string, number>,
  impliedPairs: ReadonlyMap<string, number>,
): GroupPairDto[] {
  const byId = new Map(participants.map((participant) => [participant.id, participant]))
  const pairs = new Map<string, GroupPairDto>()

  for (const key of new Set([...directPairs.keys(), ...impliedPairs.keys()])) {
    const [leftId, rightId] = key.split('|') as [string, string]
    if (leftId === rightId) continue
    const normalizedKey = [leftId, rightId].sort().join('|')
    if (pairs.has(normalizedKey)) continue

    const left = byId.get(leftId)
    const right = byId.get(rightId)
    if (!left || !right) continue

    const directReplies =
      (directPairs.get(`${leftId}|${rightId}`) ?? 0) + (directPairs.get(`${rightId}|${leftId}`) ?? 0)
    const impliedReplies =
      (impliedPairs.get(`${leftId}|${rightId}`) ?? 0) + (impliedPairs.get(`${rightId}|${leftId}`) ?? 0)
    const symmetricScore = directReplies * 2 + impliedReplies
    if (!symmetricScore) continue

    pairs.set(normalizedKey, {
      leftParticipantId: left.id,
      leftParticipantName: left.name,
      rightParticipantId: right.id,
      rightParticipantName: right.name,
      symmetricScore,
      directReplies,
      impliedReplies,
    })
  }

  return [...pairs.values()].sort((left, right) => right.symmetricScore - left.symmetricScore).slice(0, 5)
}

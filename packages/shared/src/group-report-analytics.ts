import type {
  GroupHealthDto,
  GroupMemberRole,
  GroupPairDto,
  GroupParticipantDto,
  GroupReportDto,
  TopItemDto,
} from './api'
import { calculateAverage } from './analytics-primitives'
import { resolveProductGroupRole } from './group-report'

export interface GroupReportParticipantInput {
  id: string
  name: string
  isSelf: boolean
  messageCount: number
  wordCount: number
  mediaCount: number
  activeDays: ReadonlySet<string>
  starterCount: number
  replyCount: number
  repliesReceived: number
  firstSeen: Date | null
  lastSeen: Date | null
  wordCounts: ReadonlyMap<string, number>
  emojiCounts: ReadonlyMap<string, number>
}

export interface GroupReportTimelineEntry {
  messageId: string
  outgoing: boolean
  timestamp: Date
  senderId: string
  senderName: string
  replyToMessageId: string | null
}

export interface GroupReportAnalyticsInput {
  totalMessages: number
  mediaCount: number
  voiceCount: number
  stickerCount: number
  fileCount: number
  firstMessageAt: Date | null
  lastMessageAt: Date | null
  timeZone: string
  activeDays: number
  now: Date
  wordCounts: ReadonlyMap<string, number>
  messageIndex: ReadonlyMap<string, { senderId: string; senderName: string }>
  timeline: readonly GroupReportTimelineEntry[]
  participants: readonly GroupReportParticipantInput[]
}

const GROUP_SESSION_BOUNDARY_MS = 4 * 60 * 60 * 1000
const IMPLIED_REPLY_WINDOW_MS = 10 * 60 * 1000
const RESPONSE_COVERAGE_WINDOW_MS = 30 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export function computeGroupReportAnalytics(input: GroupReportAnalyticsInput): GroupReportDto {
  const participants = input.participants.map((participant) => ({
    ...participant,
    activeDays: new Set(participant.activeDays),
    wordCounts: new Map(participant.wordCounts),
    emojiCounts: new Map(participant.emojiCounts),
  }))
  const participantById = new Map(participants.map((participant) => [participant.id, participant]))
  const totalMedia = input.mediaCount + input.voiceCount + input.stickerCount + input.fileCount
  const activeMembers = participants.length
  const lastMessageAt = input.lastMessageAt ?? input.now
  const firstMessageAt = input.firstMessageAt ?? lastMessageAt
  const durationDays = Math.max(1, Math.ceil((lastMessageAt.getTime() - firstMessageAt.getTime()) / DAY_MS) + 1)
  const directPairCounts = new Map<string, number>()
  const impliedPairCounts = new Map<string, number>()
  const hourlyParticipants = new Map<string, Set<string>>()
  const timeline = input.timeline
    .filter((entry) => !Number.isNaN(entry.timestamp.getTime()))
    .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime())
  const nextDifferentMessages = findNextDifferentMessages(timeline)
  const getLocalTime = createZonedDayAndHourFormatter(input.timeZone)
  let totalSessions = 0
  let conversationTurns = 0
  let respondedTurns = 0

  for (let index = 0; index < timeline.length; index += 1) {
    const current = timeline[index]
    if (!current) continue
    const currentParticipant = participantById.get(current.senderId)
    if (!currentParticipant) continue

    const localTime = getLocalTime(current.timestamp)
    const hourKey = `${localTime.day}:${String(localTime.hour).padStart(2, '0')}`
    const hourParticipants = hourlyParticipants.get(hourKey) ?? new Set<string>()
    hourParticipants.add(current.senderId)
    hourlyParticipants.set(hourKey, hourParticipants)

    const previous = timeline[index - 1]
    if (!previous || current.timestamp.getTime() - previous.timestamp.getTime() > GROUP_SESSION_BOUNDARY_MS) {
      currentParticipant.starterCount += 1
      totalSessions += 1
    }

    if (current.replyToMessageId) {
      const repliedTo = input.messageIndex.get(current.replyToMessageId)
      if (repliedTo && repliedTo.senderId !== current.senderId) {
        currentParticipant.replyCount += 1
        const recipient = participantById.get(repliedTo.senderId)
        if (recipient) recipient.repliesReceived += 1
        incrementPairCount(directPairCounts, `${repliedTo.senderId}|${current.senderId}`)
      }
    } else if (previous && previous.senderId !== current.senderId) {
      const gapMs = current.timestamp.getTime() - previous.timestamp.getTime()
      if (gapMs >= 0 && gapMs <= IMPLIED_REPLY_WINDOW_MS) {
        incrementPairCount(impliedPairCounts, `${previous.senderId}|${current.senderId}`)
      }
    }

    const nextMessage = timeline[index + 1]
    const isTurnEnd = !nextMessage || nextMessage.senderId !== current.senderId
    const nextDifferent = nextDifferentMessages[index]
    if (isTurnEnd) {
      conversationTurns += 1
    }
    if (isTurnEnd && nextDifferent) {
      const gapMs = nextDifferent.timestamp.getTime() - current.timestamp.getTime()
      if (gapMs >= 0 && gapMs <= RESPONSE_COVERAGE_WINDOW_MS) respondedTurns += 1
    }
  }

  const participantWordPresence = new Map<string, number>()
  for (const participant of participants) {
    for (const word of participant.wordCounts.keys()) {
      incrementPairCount(participantWordPresence, word)
    }
  }

  const sharedVocabularyThreshold = Math.max(1, Math.ceil(activeMembers * 0.5))
  const sharedVocabulary = topItems(
    new Map(
      Array.from(input.wordCounts.entries()).filter(
        ([word]) => (participantWordPresence.get(word) ?? 0) >= sharedVocabularyThreshold,
      ),
    ),
    15,
  )
  const uniqueGroupWords = topItems(
    new Map(
      Array.from(input.wordCounts.entries()).filter(([word, count]) => {
        const presence = participantWordPresence.get(word) ?? 0
        return count >= 3 && presence <= Math.max(1, Math.floor(activeMembers * 0.3))
      }),
    ),
    15,
  )

  const activeMembersLast30Days = participants.filter(
    (participant) => participant.lastSeen && input.now.getTime() - participant.lastSeen.getTime() <= 30 * DAY_MS,
  ).length
  const previousWindowStart = new Date(input.now.getTime() - 60 * DAY_MS)
  const previousWindowEnd = new Date(input.now.getTime() - 30 * DAY_MS)
  const previousActiveMembers = participants.filter(
    (participant) =>
      participant.lastSeen && participant.lastSeen >= previousWindowStart && participant.lastSeen < previousWindowEnd,
  ).length
  const momentum: GroupHealthDto['momentum'] =
    previousActiveMembers > 0
      ? activeMembersLast30Days > previousActiveMembers * 1.15
        ? 'growing'
        : activeMembersLast30Days < previousActiveMembers * 0.85
          ? 'shrinking'
          : 'stable'
      : activeMembersLast30Days > 0
        ? 'growing'
        : 'stable'

  const earlyWindowEnd = new Date(firstMessageAt.getTime() + 90 * DAY_MS)
  const recentWindowStart = new Date(lastMessageAt.getTime() - 90 * DAY_MS)
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

  const firstHalfBoundary = new Date(
    firstMessageAt.getTime() + (lastMessageAt.getTime() - firstMessageAt.getTime()) / 2,
  )
  const churnedMembers = participants.filter(
    (participant) =>
      participant.lastSeen &&
      participant.lastSeen < new Date(input.now.getTime() - 90 * DAY_MS) &&
      participant.firstSeen &&
      participant.firstSeen < firstHalfBoundary,
  )

  const shares = participants
    .map((participant) => (input.totalMessages ? participant.messageCount / input.totalMessages : 0))
    .sort((left, right) => left - right)
  const meanShare = shares.length ? calculateAverage(shares) : 0
  const giniCoefficient =
    shares.length && meanShare
      ? Number(
          (
            shares.reduce((sum, share, index) => sum + (2 * (index + 1) - shares.length - 1) * share, 0) /
            (shares.length * shares.length * meanShare)
          ).toFixed(3),
        )
      : 0
  const lurkerRatio = activeMembers
    ? Number(
        (
          (participants.filter((participant) =>
            input.totalMessages ? (participant.messageCount / input.totalMessages) * 100 < 0.5 : true,
          ).length /
            activeMembers) *
          100
        ).toFixed(1),
      )
    : 0
  const responseCoverage = conversationTurns
    ? Number(((respondedTurns / conversationTurns) * 100).toFixed(1))
    : 0
  const consistency = Number(((input.activeDays / durationDays) * 100).toFixed(1))
  const peakSimultaneity = Array.from(hourlyParticipants.values()).reduce((max, set) => Math.max(max, set.size), 0)
  const healthScore = Number(
    ((1 - giniCoefficient) * 100 * 0.3 + retentionRate * 0.25 + consistency * 0.25 + responseCoverage * 0.2).toFixed(1),
  )

  const participantsDto: GroupParticipantDto[] = participants
    .map((participant) => {
      const messageShare = input.totalMessages
        ? Number(((participant.messageCount / input.totalMessages) * 100).toFixed(1))
        : 0
      const mediaShare = totalMedia ? Number(((participant.mediaCount / totalMedia) * 100).toFixed(1)) : 0
      const avgWordsPerMessage = participant.messageCount
        ? Number((participant.wordCount / participant.messageCount).toFixed(2))
        : null
      const starterShare = totalSessions ? Number(((participant.starterCount / totalSessions) * 100).toFixed(1)) : 0
      const consistencyScore = Number(((participant.activeDays.size / durationDays) * 100).toFixed(1))
      const magnetScore = participant.messageCount
        ? Number((participant.repliesReceived / participant.messageCount).toFixed(2))
        : null
      const replyRatio = participant.messageCount
        ? Number((participant.replyCount / participant.messageCount).toFixed(2))
        : null
      const role: GroupMemberRole = resolveProductGroupRole(
        {
          messageShare,
          consistencyScore,
          starterShare,
          firstSeen: participant.firstSeen,
          lastSeen: participant.lastSeen,
          messageCount: participant.messageCount,
        },
        input.now,
      )

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
        topWords: topItems(participant.wordCounts, 5),
        topEmoji: topItems(participant.emojiCounts, 5),
        topicSignature: computeTopicSignature(participant.wordCounts, input.wordCounts),
      }
    })
    .sort((left, right) => right.messageCount - left.messageCount)

  return {
    participants: participantsDto,
    topPairs: buildGroupTopPairs(participantsDto, directPairCounts, impliedPairCounts),
    health:
      input.totalMessages > 0 && activeMembers > 0
        ? {
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
          }
        : null,
    sharedVocabulary,
    uniqueGroupWords,
  }
}

function findNextDifferentMessages(timeline: readonly GroupReportTimelineEntry[]) {
  const nextDifferentMessages: Array<GroupReportTimelineEntry | undefined> = Array(timeline.length)
  let nextRunStart: GroupReportTimelineEntry | undefined
  let index = timeline.length - 1

  while (index >= 0) {
    const current = timeline[index]
    if (!current) {
      index -= 1
      continue
    }

    let runStart = index
    while (runStart > 0 && timeline[runStart - 1]?.senderId === current.senderId) runStart -= 1
    for (let runIndex = runStart; runIndex <= index; runIndex += 1) {
      nextDifferentMessages[runIndex] = nextRunStart
    }
    nextRunStart = timeline[runStart]
    index = runStart - 1
  }

  return nextDifferentMessages
}

function incrementPairCount(counts: Map<string, number>, key: string) {
  counts.set(key, (counts.get(key) ?? 0) + 1)
}

function topItems(counts: ReadonlyMap<string, number>, limit: number): TopItemDto[] {
  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }))
}

function computeTopicSignature(source: ReadonlyMap<string, number>, total: ReadonlyMap<string, number>) {
  const sourceTotal = Array.from(source.values()).reduce((sum, value) => sum + value, 0)
  const totalWords = Array.from(total.values()).reduce((sum, value) => sum + value, 0)
  if (!sourceTotal || !totalWords) return [] as TopItemDto[]

  return Array.from(source.entries())
    .map(([word, count]) => {
      const localShare = count / sourceTotal
      const globalShare = (total.get(word) ?? count) / totalWords
      return { value: word, count: Number((localShare / Math.max(globalShare, 1 / totalWords)).toFixed(2)) }
    })
    .sort((left, right) => right.count - left.count)
    .slice(0, 5)
}

function buildGroupTopPairs(
  participants: readonly GroupParticipantDto[],
  directPairCounts: ReadonlyMap<string, number>,
  impliedPairCounts: ReadonlyMap<string, number>,
): GroupPairDto[] {
  const pairKeys = new Set([...directPairCounts.keys(), ...impliedPairCounts.keys()])
  const participantsById = new Map(participants.map((participant) => [participant.id, participant]))
  const combined = new Map<string, GroupPairDto>()

  for (const key of pairKeys) {
    const [leftId, rightId] = key.split('|')
    if (!leftId || !rightId || leftId === rightId) continue
    const normalizedKey = [leftId, rightId].sort().join('|')
    if (combined.has(normalizedKey)) continue

    const directReplies =
      (directPairCounts.get(`${leftId}|${rightId}`) ?? 0) + (directPairCounts.get(`${rightId}|${leftId}`) ?? 0)
    const impliedReplies =
      (impliedPairCounts.get(`${leftId}|${rightId}`) ?? 0) + (impliedPairCounts.get(`${rightId}|${leftId}`) ?? 0)
    const symmetricScore = directReplies * 2 + impliedReplies
    if (!symmetricScore) continue

    const left = participantsById.get(leftId)
    const right = participantsById.get(rightId)
    if (!left || !right) continue

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

function createZonedDayAndHourFormatter(timeZone: string) {
  let formatter: Intl.DateTimeFormat | undefined
  try {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    })
  } catch {
    // Invalid time zones retain the previous UTC fallback behavior.
  }

  return (date: Date) => {
    if (!formatter) {
      return {
        day: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`,
        hour: date.getUTCHours(),
      }
    }

    const parts = formatter.formatToParts(date)
    const values = new Map(parts.map(({ type, value }) => [type, value]))
    return {
      day: `${values.get('year') ?? '1970'}-${values.get('month') ?? '01'}-${values.get('day') ?? '01'}`,
      hour: Number(values.get('hour') ?? 0),
    }
  }
}

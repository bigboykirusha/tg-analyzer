import type { GapDto, ResponseStatsDto, SessionStatsDto } from '../api/types'
import { calculateAverage, calculateMedian, calculatePercentile, roundTo } from './primitives'

export interface TimelinePoint {
  /** Epoch milliseconds. */
  ts: number
  outgoing: boolean
}

/** Silence longer than this starts a new conversation session. */
export const SESSION_BOUNDARY_MS = 8 * 60 * 60 * 1000
const LONG_SILENCE_MS = 30 * 24 * 60 * 60 * 1000
const MAX_SILENCES = 8

/** Returns the points in chronological order without invalid timestamps; sorts only when needed. */
export function chronological<T extends TimelinePoint>(timeline: readonly T[]): readonly T[] {
  let sorted = true
  let valid = true
  for (let index = 0; index < timeline.length; index += 1) {
    const current = timeline[index]!.ts
    if (!Number.isFinite(current)) valid = false
    else if (index > 0 && current < timeline[index - 1]!.ts) sorted = false
  }
  if (sorted && valid) return timeline
  return timeline.filter((point) => Number.isFinite(point.ts)).sort((left, right) => left.ts - right.ts)
}

const iso = (ts: number) => new Date(ts).toISOString()

export interface GapAnalytics {
  longestGap: GapDto | null
  silencesOver30Days: GapDto[]
}

export function computeGaps(timeline: readonly TimelinePoint[]): GapAnalytics {
  const ordered = chronological(timeline)
  let longest: { from: number; to: number } | null = null
  const silences: { from: number; to: number }[] = []

  for (let index = 1; index < ordered.length; index += 1) {
    const from = ordered[index - 1]!.ts
    const to = ordered[index]!.ts
    if (!longest || to - from > longest.to - longest.from) longest = { from, to }
    if (to - from > LONG_SILENCE_MS) silences.push({ from, to })
  }

  const toGap = ({ from, to }: { from: number; to: number }): GapDto => ({
    seconds: Math.round((to - from) / 1000),
    from: iso(from),
    to: iso(to),
  })

  return {
    longestGap: longest ? toGap(longest) : null,
    silencesOver30Days: silences
      .sort((left, right) => right.to - right.from - (left.to - left.from))
      .slice(0, MAX_SILENCES)
      .map(toGap),
  }
}

/**
 * Reply tempo of a one-to-one conversation. A reply is the first message after
 * the other side spoke, within the same session.
 */
export function computeResponseStats(timeline: readonly TimelinePoint[]): ResponseStatsDto {
  const ordered = chronological(timeline)
  const mine: number[] = []
  const theirs: number[] = []
  let sessions = 0
  let sessionsStartedByMe = 0

  for (let index = 0; index < ordered.length; index += 1) {
    const current = ordered[index]!
    const previous = ordered[index - 1]
    const gapMs = previous ? current.ts - previous.ts : Number.POSITIVE_INFINITY

    if (gapMs > SESSION_BOUNDARY_MS) {
      sessions += 1
      if (current.outgoing) sessionsStartedByMe += 1
      continue
    }
    if (previous && previous.outgoing !== current.outgoing) {
      ;(current.outgoing ? mine : theirs).push(Math.round(gapMs / 1000))
    }
  }

  return {
    medianMineSec: calculateMedian(mine),
    medianTheirsSec: calculateMedian(theirs),
    mineSamples: mine.length,
    theirsSamples: theirs.length,
    mineP25Sec: calculatePercentile(mine, 25),
    mineP75Sec: calculatePercentile(mine, 75),
    mineP95Sec: calculatePercentile(mine, 95),
    theirsP25Sec: calculatePercentile(theirs, 25),
    theirsP75Sec: calculatePercentile(theirs, 75),
    theirsP95Sec: calculatePercentile(theirs, 95),
    responseRate: computeResponseRate(ordered),
    iWriteFirstPct: sessions ? Math.round((sessionsStartedByMe / sessions) * 100) : null,
  }
}

/** Share (0–100) of conversational turns that got an answer within the same session. */
export function computeResponseRate(timeline: readonly TimelinePoint[]): number | null {
  const ordered = chronological(timeline)
  if (ordered.length < 2) return null

  let turns = 0
  let answeredTurns = 0
  let turnOutgoing = ordered[0]!.outgoing

  for (let index = 1; index < ordered.length; index += 1) {
    const current = ordered[index]!
    if (current.ts - ordered[index - 1]!.ts > SESSION_BOUNDARY_MS) {
      turns += 1
      turnOutgoing = current.outgoing
    } else if (current.outgoing !== turnOutgoing) {
      turns += 1
      answeredTurns += 1
      turnOutgoing = current.outgoing
    }
  }

  turns += 1
  return roundTo((answeredTurns / turns) * 100, 2)
}

export function emptySessionStats(): SessionStatsDto {
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

interface Session {
  startedAt: number
  endedAt: number
  totalMessages: number
  sentMessages: number
  receivedMessages: number
}

/**
 * Splits the conversation into sessions separated by long silences.
 * `localHour` converts a timestamp into the user's local hour (night = 23:00–05:59).
 */
export function computeSessionStats(
  timeline: readonly TimelinePoint[],
  activeDays: number,
  localHour: (ts: number) => number,
  boundaryMs = SESSION_BOUNDARY_MS,
): SessionStatsDto {
  const ordered = chronological(timeline)
  if (!ordered.length) return emptySessionStats()

  const sessions: Session[] = []
  let current: Session | null = null
  for (const point of ordered) {
    if (!current || point.ts - current.endedAt > boundaryMs) {
      current = { startedAt: point.ts, endedAt: point.ts, totalMessages: 0, sentMessages: 0, receivedMessages: 0 }
      sessions.push(current)
    }
    current.endedAt = point.ts
    current.totalMessages += 1
    if (point.outgoing) current.sentMessages += 1
    else current.receivedMessages += 1
  }

  const durations = sessions.map((session) => Math.round((session.endedAt - session.startedAt) / 1000))
  const sizes = sessions.map((session) => session.totalMessages)
  const nightSessions = sessions.filter((session) => {
    const hour = localHour(session.startedAt)
    return hour >= 23 || hour <= 5
  }).length

  const densest = sessions.reduce((best, session) => (session.totalMessages > best.totalMessages ? session : best))
  const longest = sessions.reduce((best, session) =>
    session.endedAt - session.startedAt > best.endedAt - best.startedAt ? session : best,
  )
  const highlights = (densest === longest ? [densest] : [densest, longest]).map(toHighlight)

  return {
    totalSessions: sessions.length,
    averageSessionMessages: Math.round(calculateAverage(sizes)),
    averageSessionDurationSec: Math.round(calculateAverage(durations)),
    longestSessionMessages: Math.max(...sizes),
    longestSessionDurationSec: Math.max(...durations),
    sessionsPerActiveWeek: roundTo(sessions.length / Math.max(activeDays / 7, 1), 1),
    nightSessionsPct: Math.round((nightSessions / sessions.length) * 100),
    highlights,
  }
}

function toHighlight(session: Session) {
  return {
    startedAt: iso(session.startedAt),
    endedAt: iso(session.endedAt),
    durationSec: Math.round((session.endedAt - session.startedAt) / 1000),
    totalMessages: session.totalMessages,
    sentMessages: session.sentMessages,
    receivedMessages: session.receivedMessages,
  }
}

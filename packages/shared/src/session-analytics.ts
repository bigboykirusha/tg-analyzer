import type { SessionStatsDto } from './api'
import { calculateAverage } from './analytics-primitives'

export interface SessionTimelineMessage {
  outgoing: boolean
  timestamp: Date
}

const DEFAULT_SESSION_BOUNDARY_MS = 8 * 60 * 60 * 1000

export function computeSessionStats(
  timeline: readonly SessionTimelineMessage[],
  activeDays: number,
  timeZone: string,
  boundaryMs = DEFAULT_SESSION_BOUNDARY_MS,
): SessionStatsDto {
  if (timeline.length === 0) return emptySessionStats()

  const sessions: SessionStatsDto['highlights'] = []
  const first = timeline[0]
  if (!first) return emptySessionStats()

  let currentSession = {
    startedAt: first.timestamp,
    endedAt: first.timestamp,
    totalMessages: 1,
    sentMessages: Number(first.outgoing),
    receivedMessages: Number(!first.outgoing),
  }

  for (let index = 1; index < timeline.length; index += 1) {
    const item = timeline[index]
    const previous = timeline[index - 1]
    if (!item || !previous) continue

    if (item.timestamp.getTime() - previous.timestamp.getTime() > boundaryMs) {
      sessions.push(toSessionHighlight(currentSession))
      currentSession = {
        startedAt: item.timestamp,
        endedAt: item.timestamp,
        totalMessages: 1,
        sentMessages: Number(item.outgoing),
        receivedMessages: Number(!item.outgoing),
      }
      continue
    }

    currentSession.endedAt = item.timestamp
    currentSession.totalMessages += 1
    if (item.outgoing) currentSession.sentMessages += 1
    else currentSession.receivedMessages += 1
  }
  sessions.push(toSessionHighlight(currentSession))

  const durations = sessions.map(({ durationSec }) => durationSec)
  const messageCounts = sessions.map(({ totalMessages }) => totalMessages)
  const nightSessions = sessions.filter(({ startedAt }) => {
    const hour = getZonedHour(new Date(startedAt), timeZone)
    return hour >= 23 || hour <= 5
  }).length
  const activeWeeks = Math.max(activeDays / 7, 1)
  const longestByDuration = [...sessions].sort((left, right) => right.durationSec - left.durationSec)[0] ?? null
  const densestByMessages = [...sessions].sort((left, right) => right.totalMessages - left.totalMessages)[0] ?? null
  const highlights = [densestByMessages, longestByDuration]
    .filter(
      (value, index, items): value is NonNullable<typeof value> => Boolean(value) && items.indexOf(value) === index,
    )
    .slice(0, 3)

  return {
    totalSessions: sessions.length,
    averageSessionMessages: Math.round(calculateAverage(messageCounts)),
    averageSessionDurationSec: averageOrNull(durations),
    longestSessionMessages: Math.max(...messageCounts),
    longestSessionDurationSec: durations.length ? Math.max(...durations) : null,
    sessionsPerActiveWeek: Number((sessions.length / activeWeeks).toFixed(1)),
    nightSessionsPct: sessions.length ? Math.round((nightSessions / sessions.length) * 100) : null,
    highlights,
  }
}

function toSessionHighlight(session: {
  startedAt: Date
  endedAt: Date
  totalMessages: number
  sentMessages: number
  receivedMessages: number
}): SessionStatsDto['highlights'][number] {
  return {
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt.toISOString(),
    durationSec: Math.max(0, Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 1000)),
    totalMessages: session.totalMessages,
    sentMessages: session.sentMessages,
    receivedMessages: session.receivedMessages,
  }
}

function getZonedHour(date: Date, timeZone: string): number {
  try {
    const hour = new Intl.DateTimeFormat('en-US', { timeZone, hour: '2-digit', hourCycle: 'h23' })
      .formatToParts(date)
      .find((part) => part.type === 'hour')?.value
    return Number(hour ?? 0)
  } catch {
    return date.getUTCHours()
  }
}

function averageOrNull(values: readonly number[]) {
  return values.length ? Math.round(calculateAverage(values)) : null
}

function emptySessionStats(): SessionStatsDto {
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

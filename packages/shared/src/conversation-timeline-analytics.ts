import type { LongestGapDto, ResponseStatsDto } from './api'
import { calculateMedian, calculatePercentile } from './analytics-primitives'
import { computeResponseRate } from './relationship-analytics'

export interface ConversationTimelineEntry {
  timestamp: Date
  outgoing: boolean
}

export interface ConversationTimelineAnalytics {
  longestGap: LongestGapDto | null
  silencePeriodsOver30Days: LongestGapDto[]
  responseStats: ResponseStatsDto
  averageMyResponseSec: number | null
  medianMyResponseSec: number | null
  medianTheirResponseSec: number | null
  iWriteFirstPct: number | null
  responseRate: number | null
}

const SESSION_BOUNDARY_MS = 8 * 60 * 60 * 1000
const LONG_SILENCE_MS = 30 * 24 * 60 * 60 * 1000

export function computeConversationTimelineAnalytics(
  timeline: readonly ConversationTimelineEntry[],
  privateLike: boolean,
): ConversationTimelineAnalytics {
  const orderedTimeline = timeline
    .filter((entry) => !Number.isNaN(entry.timestamp.getTime()))
    .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime())
  const mineResponseSeconds: number[] = []
  const theirsResponseSeconds: number[] = []
  const sessionStarts: boolean[] = []
  const silencePeriodsOver30Days: LongestGapDto[] = []
  let longestGap: LongestGapDto | null = null

  for (let index = 0; index < orderedTimeline.length; index += 1) {
    const current = orderedTimeline[index]
    if (!current) continue
    const previous = orderedTimeline[index - 1]
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
    if (!longestGap || gap.seconds > longestGap.seconds) longestGap = gap
    if (gapMs > LONG_SILENCE_MS) silencePeriodsOver30Days.push(gap)
    if (gapMs > SESSION_BOUNDARY_MS) sessionStarts.push(current.outgoing)

    if (privateLike && previous.outgoing !== current.outgoing && gapMs >= 0 && gapMs <= SESSION_BOUNDARY_MS) {
      if (current.outgoing) mineResponseSeconds.push(gap.seconds)
      else theirsResponseSeconds.push(gap.seconds)
    }
  }

  const medianMineSec = privateLike ? calculateMedian(mineResponseSeconds) : null
  const medianTheirsSec = privateLike ? calculateMedian(theirsResponseSeconds) : null
  const responseStats = createResponseStats({
    mineResponseSeconds: privateLike ? mineResponseSeconds : [],
    theirsResponseSeconds: privateLike ? theirsResponseSeconds : [],
    medianMineSec,
    medianTheirsSec,
  })
  const outgoingSessions = sessionStarts.filter(Boolean).length

  return {
    longestGap,
    silencePeriodsOver30Days: silencePeriodsOver30Days.sort((left, right) => right.seconds - left.seconds).slice(0, 8),
    responseStats,
    averageMyResponseSec: mineResponseSeconds.length
      ? Math.round(mineResponseSeconds.reduce((sum, seconds) => sum + seconds, 0) / mineResponseSeconds.length)
      : null,
    medianMyResponseSec: medianMineSec,
    medianTheirResponseSec: medianTheirsSec,
    iWriteFirstPct:
      privateLike && sessionStarts.length > 0 ? Math.round((outgoingSessions / sessionStarts.length) * 100) : null,
    responseRate: privateLike ? computeResponseRate(orderedTimeline) : null,
  }
}

function createResponseStats(params: {
  mineResponseSeconds: readonly number[]
  theirsResponseSeconds: readonly number[]
  medianMineSec: number | null
  medianTheirsSec: number | null
}): ResponseStatsDto {
  return {
    medianMineSec: params.medianMineSec,
    medianTheirsSec: params.medianTheirsSec,
    mineSamples: params.mineResponseSeconds.length,
    theirsSamples: params.theirsResponseSeconds.length,
    mineP25Sec: calculatePercentile(params.mineResponseSeconds, 25),
    mineP75Sec: calculatePercentile(params.mineResponseSeconds, 75),
    mineP95Sec: calculatePercentile(params.mineResponseSeconds, 95),
    theirsP25Sec: calculatePercentile(params.theirsResponseSeconds, 25),
    theirsP75Sec: calculatePercentile(params.theirsResponseSeconds, 75),
    theirsP95Sec: calculatePercentile(params.theirsResponseSeconds, 95),
  }
}

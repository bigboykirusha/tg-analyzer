import type {
  ConversationFactsDto,
  HealthScoreDto,
  RelationshipScoreDto,
  ResponseStatsDto,
  SessionStatsDto,
} from './api'
import { calculateAverage, clampNumber } from './analytics-primitives'

export function computeResponseRate(
  timeline: readonly { outgoing: boolean; timestamp: Date }[],
  sessionBoundaryMs = 8 * 60 * 60 * 1000,
): number | null {
  if (timeline.length < 2) return null

  let totalTurns = 0
  let repliedTurns = 0
  const first = timeline[0]
  if (!first) return null
  let turnOutgoing = first.outgoing

  for (let index = 1; index < timeline.length; index += 1) {
    const current = timeline[index]
    const previous = timeline[index - 1]
    if (!current || !previous) continue
    const gapMs = current.timestamp.getTime() - previous.timestamp.getTime()

    if (gapMs > sessionBoundaryMs) {
      totalTurns += 1
      turnOutgoing = current.outgoing
      continue
    }

    if (current.outgoing !== turnOutgoing) {
      totalTurns += 1
      repliedTurns += 1
      turnOutgoing = current.outgoing
    }
  }

  totalTurns += 1
  return totalTurns ? Number(((repliedTurns / totalTurns) * 100).toFixed(2)) : null
}

export function computeHealthScore(params: {
  responseRate: number | null
  sessionStats: SessionStatsDto
  activeDays: number
  relationshipScore: RelationshipScoreDto | null
  trend: ConversationFactsDto['trend']
}): HealthScoreDto | null {
  if (!params.relationshipScore || params.responseRate === null) return null

  const sessions = params.sessionStats.totalSessions
  const fragmentation = sessions > 0 ? Math.max(0, sessions - params.activeDays) / sessions : 0
  const initiativeBalance = params.relationshipScore.attentionBalance
  const longTermStability = clampNumber(
    Math.round(
      (params.relationshipScore.stability ?? 50) * 0.7 +
        (params.trend === 'growing' ? 90 : params.trend === 'stable' ? 75 : params.trend === 'fading' ? 35 : 55) * 0.3,
    ),
  )
  const score = clampNumber(
    Math.round(
      params.responseRate * 0.3 +
        (100 - fragmentation * 50) * 0.2 +
        (initiativeBalance ?? 50) * 0.2 +
        longTermStability * 0.3,
    ),
  )

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

export function computeRelationshipScore(params: {
  privateLike: boolean
  sentMessages: number
  receivedMessages: number
  iWriteFirstPct: number | null
  responseStats: ResponseStatsDto
  activeDays: number
  maxStreakDays: number
  trend: ConversationFactsDto['trend']
}): RelationshipScoreDto | null {
  if (!params.privateLike) return null

  const totalMessages = params.sentMessages + params.receivedMessages
  if (!totalMessages) return null

  const shareDelta = Math.abs(params.sentMessages - params.receivedMessages) / totalMessages
  const reciprocity = clampNumber(Math.round((1 - shareDelta) * 100))
  const attentionBalance =
    params.iWriteFirstPct === null ? reciprocity : clampNumber(100 - Math.abs(params.iWriteFirstPct - 50) * 2)
  const responsivenessSamples = [params.responseStats.medianMineSec, params.responseStats.medianTheirsSec].reduce<
    number[]
  >((acc, value) => {
    const scored = scoreResponsiveness(value)
    if (scored !== null) acc.push(scored)
    return acc
  }, [])
  const responsiveness = responsivenessSamples.length ? Math.round(calculateAverage(responsivenessSamples)) : null
  const stability = clampNumber(
    Math.round(
      Math.min(1, params.activeDays / 60) * 45 +
        Math.min(1, params.maxStreakDays / 21) * 35 +
        (params.trend === 'fading' ? 5 : params.trend === 'growing' ? 20 : params.trend === 'stable' ? 15 : 10),
    ),
  )
  const score = clampNumber(
    Math.round(reciprocity * 0.3 + (responsiveness ?? 55) * 0.25 + stability * 0.25 + attentionBalance * 0.2),
  )

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

  return { score, label, reciprocity, responsiveness, stability, attentionBalance }
}

function scoreResponsiveness(medianSeconds: number | null): number | null {
  if (medianSeconds === null) return null
  if (medianSeconds <= 15 * 60) return 100
  if (medianSeconds <= 60 * 60) return 85
  if (medianSeconds <= 4 * 60 * 60) return 65
  if (medianSeconds <= 24 * 60 * 60) return 40
  return 20
}

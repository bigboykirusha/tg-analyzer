import type { HealthScoreDto, RelationshipScoreDto, ResponseStatsDto, SessionStatsDto, Trend } from '../api/types'
import { calculateAverage, clampNumber, roundTo } from './primitives'

function scoreResponsiveness(medianSeconds: number | null): number | null {
  if (medianSeconds === null) return null
  if (medianSeconds <= 15 * 60) return 100
  if (medianSeconds <= 60 * 60) return 85
  if (medianSeconds <= 4 * 60 * 60) return 65
  if (medianSeconds <= 24 * 60 * 60) return 40
  return 20
}

/** Balance of a one-to-one conversation, 0–100. Only defined for private chats. */
export function computeRelationshipScore(params: {
  sentMessages: number
  receivedMessages: number
  responses: ResponseStatsDto
  activeDays: number
  maxStreakDays: number
  trend: Trend
}): RelationshipScoreDto | null {
  const totalMessages = params.sentMessages + params.receivedMessages
  if (!totalMessages) return null

  const reciprocity = clampNumber(
    Math.round((1 - Math.abs(params.sentMessages - params.receivedMessages) / totalMessages) * 100),
  )
  const attentionBalance =
    params.responses.iWriteFirstPct === null
      ? reciprocity
      : clampNumber(100 - Math.abs(params.responses.iWriteFirstPct - 50) * 2)
  const tempoScores = [params.responses.medianMineSec, params.responses.medianTheirsSec]
    .map(scoreResponsiveness)
    .filter((value): value is number => value !== null)
  const responsiveness = tempoScores.length ? Math.round(calculateAverage(tempoScores)) : null
  const trendBonus = { growing: 20, stable: 15, unknown: 10, fading: 5 }[params.trend]
  const stability = clampNumber(
    Math.round(Math.min(1, params.activeDays / 60) * 45 + Math.min(1, params.maxStreakDays / 21) * 35 + trendBonus),
  )
  const score = clampNumber(
    Math.round(reciprocity * 0.3 + (responsiveness ?? 55) * 0.25 + stability * 0.25 + attentionBalance * 0.2),
  )

  let label: RelationshipScoreDto['label'] = 'balanced'
  if (score >= 78 && params.trend !== 'fading') label = 'warm'
  else if (params.trend === 'fading' || (responsiveness !== null && responsiveness < 45)) label = 'cooling'
  else if (reciprocity < 45 || attentionBalance < 40) label = 'one_sided'
  else if (params.activeDays < 14 || params.maxStreakDays < 5) label = 'emerging'

  return { score, label, reciprocity, responsiveness, stability, attentionBalance }
}

/** Overall conversation health, 0–100, combining continuity, balance and long-term stability. */
export function computeHealthScore(params: {
  responseRate: number | null
  sessions: SessionStatsDto
  activeDays: number
  relationship: RelationshipScoreDto | null
  trend: Trend
}): HealthScoreDto | null {
  if (!params.relationship || params.responseRate === null) return null

  const { totalSessions } = params.sessions
  const fragmentation = totalSessions > 0 ? Math.max(0, totalSessions - params.activeDays) / totalSessions : 0
  const initiativeBalance = params.relationship.attentionBalance
  const trendScore = { growing: 90, stable: 75, unknown: 55, fading: 35 }[params.trend]
  const longTermStability = clampNumber(Math.round((params.relationship.stability ?? 50) * 0.7 + trendScore * 0.3))
  const score = clampNumber(
    Math.round(
      params.responseRate * 0.3 +
        (100 - fragmentation * 50) * 0.2 +
        (initiativeBalance ?? 50) * 0.2 +
        longTermStability * 0.3,
    ),
  )

  let label: HealthScoreDto['label'] = 'steady'
  if (score >= 80) label = 'strong'
  else if (score < 45) label = 'fragile'
  else if ((initiativeBalance ?? 100) < 40) label = 'imbalanced'

  return {
    score,
    label,
    responseRate: params.responseRate,
    fragmentation: roundTo(fragmentation * 100, 2),
    initiativeBalance,
    longTermStability,
  }
}

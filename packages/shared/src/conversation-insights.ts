import type { ConversationFactsDto, InsightDto, RelationshipScoreDto, ResponseStatsDto, SessionStatsDto } from './api'

export interface ConversationInsightInput {
  trend: ConversationFactsDto['trend']
  longestGap: ConversationFactsDto['longestGap']
  sessionStats: SessionStatsDto
  relationshipScore: RelationshipScoreDto | null
  responseStats: ResponseStatsDto
}

export function generateConversationInsights(params: ConversationInsightInput): InsightDto[] {
  const insights: InsightDto[] = []

  if (params.sessionStats.totalSessions > 0) {
    insights.push({
      key: 'session-intensity',
      title: 'Conversation rhythm',
      description: `The chat formed ${params.sessionStats.totalSessions} sessions, averaging ${params.sessionStats.averageSessionMessages} messages each.`,
      tone: 'neutral',
    })
  }

  if (params.sessionStats.longestSessionDurationSec && params.sessionStats.longestSessionDurationSec >= 3 * 60 * 60) {
    insights.push({
      key: 'long-session',
      title: 'High-intensity window',
      description: `Your longest session lasted ${Math.round(params.sessionStats.longestSessionDurationSec / 3600)}h and reached ${params.sessionStats.longestSessionMessages} messages.`,
      tone: 'positive',
    })
  }

  if (params.trend === 'growing') {
    insights.push({
      key: 'trend-growing',
      title: 'Momentum is building',
      description: 'Recent activity is stronger than the previous period, which suggests the connection is warming up.',
      tone: 'positive',
    })
  } else if (params.trend === 'fading') {
    insights.push({
      key: 'trend-fading',
      title: 'Momentum cooled down',
      description: 'Recent activity dropped versus the previous period, so this conversation may be losing cadence.',
      tone: 'warning',
    })
  }

  if (params.longestGap && params.longestGap.seconds >= 45 * 24 * 60 * 60) {
    insights.push({
      key: 'long-gap',
      title: 'Extended silence',
      description: `There was a long break of about ${Math.round(params.longestGap.seconds / 86400)} days between messages.`,
      tone: 'warning',
    })
  }

  if (params.relationshipScore) {
    const tone =
      params.relationshipScore.label === 'cooling' || params.relationshipScore.label === 'one_sided'
        ? 'warning'
        : params.relationshipScore.label === 'warm'
          ? 'positive'
          : 'neutral'
    insights.push({
      key: 'relationship-score',
      title: 'Relationship dynamics',
      description: `The balance score is ${params.relationshipScore.score}/100 with a ${params.relationshipScore.label.replace('_', ' ')} pattern.`,
      tone,
    })
  }

  if (params.responseStats.mineSamples + params.responseStats.theirsSamples >= 6) {
    const myMedian = params.responseStats.medianMineSec
    const theirMedian = params.responseStats.medianTheirsSec
    if (myMedian !== null && theirMedian !== null) {
      const slowerSide = myMedian > theirMedian ? 'You' : 'Your contact'
      const gapHours = Math.abs(myMedian - theirMedian) / 3600
      if (gapHours >= 1) {
        insights.push({
          key: 'response-asymmetry',
          title: 'Reply tempo mismatch',
          description: `${slowerSide} usually respond slower, with a median gap difference of about ${gapHours.toFixed(1)} hours.`,
          tone: 'neutral',
        })
      }
    }
  }

  return insights.slice(0, 5)
}

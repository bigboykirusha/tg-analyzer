import { MIN_REPORT_MESSAGES, type ChatReport, type InsightDto } from '../api/types'
import { clampNumber, roundTo } from './primitives'

const DAY_SEC = 86_400
/** Below these sample sizes a pattern is noise, not a habit. */
const MIN_MESSAGES = MIN_REPORT_MESSAGES
const MIN_BUSIEST_DAY = 20
const MAX_INSIGHTS = 4

type Side = 'mine' | 'theirs'

/** The side with more of something, when it has at least `factor` times as much. */
function dominant(counts: { mine: number; theirs: number }, minTotal: number, factor = 2) {
  const total = counts.mine + counts.theirs
  if (total < minTotal) return null
  const side: Side = counts.mine >= counts.theirs ? 'mine' : 'theirs'
  const more = counts[side]
  const less = counts[side === 'mine' ? 'theirs' : 'mine']
  const ratio = less ? more / less : Number.POSITIVE_INFINITY
  if (ratio < factor) return null
  return { side, more, less, ratio: Number.isFinite(ratio) ? roundTo(ratio, 1) : null }
}

/**
 * The few patterns of a private chat worth a sentence, strongest first. Only
 * what the report says nowhere else: who starts, reply speed, questions, night
 * talks, last words, streaks and the trend all have their own cards, and one
 * number lives in one place. The busiest day is a descriptive fallback when
 * the chat has few strong habits. Each rule has a sample-size floor, so a short chat
 * yields fewer, not weaker, insights. Groups get none.
 */
export function deriveInsights(report: ChatReport): InsightDto[] {
  if (report.group || report.totals.messages < MIN_MESSAGES) return []
  const insights: (InsightDto | null)[] = []
  // The share of messages is a headline number of the report itself, not an insight.
  const { facts, habits } = report

  if (habits) {
    for (const [id, counts, minTotal] of [
      ['double_texts', habits.doubleTexts, 10],
      ['laughs', habits.laughs, 20],
    ] as const) {
      const found = dominant(counts, minTotal)
      if (!found) continue
      insights.push({
        id,
        side: found.side,
        strength: clampNumber(((found.ratio ?? 5) - 1) / 4, 0, 1) * 0.9,
        values: { count: found.more, other: found.less, ...(found.ratio ? { ratio: found.ratio } : {}) },
      })
    }
  }

  const gap = facts.longestGap
  if (gap && gap.seconds >= 14 * DAY_SEC) {
    const days = Math.round(gap.seconds / DAY_SEC)
    insights.push({
      id: 'long_silence',
      side: gap.brokenByMe ? 'mine' : 'theirs',
      strength: clampNumber(days / 180, 0, 1) * 0.7,
      values: { days, ...(gap.from && gap.to ? { from: gap.from, to: gap.to } : {}) },
    })
  }

  const busiest = facts.mostActiveDate
  if (busiest && busiest.total >= MIN_BUSIEST_DAY) {
    insights.push({
      id: 'busiest_day',
      side: 'both',
      strength: 0.4,
      values: { date: busiest.date, count: busiest.total },
    })
  }

  return insights
    .filter((insight): insight is InsightDto => insight !== null && insight.strength > 0)
    .map((insight) => ({ ...insight, strength: roundTo(insight.strength, 2) }))
    .sort((left, right) => right.strength - left.strength)
    .slice(0, MAX_INSIGHTS)
}

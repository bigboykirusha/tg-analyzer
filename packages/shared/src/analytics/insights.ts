import type { ChatReport, InsightDto } from '../api/types'
import { clampNumber, roundTo } from './primitives'

const DAY_SEC = 86_400
/** Below these sample sizes a pattern is noise, not a habit. */
const MIN_MESSAGES = 100
const MIN_SESSIONS = 10
const MIN_REPLIES = 20
const MAX_INSIGHTS = 6

type Side = 'mine' | 'theirs'

/** How far a share (0–100) leans away from an even split, 0–1. */
const lean = (pct: number) => Math.abs(pct - 50) / 50

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

/** A leaning share becomes an insight about whichever side it favours. */
function shareInsight(id: InsightDto['id'], minePct: number | null, threshold = 65): InsightDto | null {
  if (minePct === null) return null
  if (minePct < threshold && minePct > 100 - threshold) return null
  const side: Side = minePct >= 50 ? 'mine' : 'theirs'
  return { id, side, strength: lean(minePct), values: { pct: side === 'mine' ? minePct : 100 - minePct } }
}

/**
 * The few patterns of a private chat worth a sentence, strongest first. Each
 * rule has a sample-size floor, so a short chat yields fewer, not weaker,
 * insights. Groups get none.
 */
export function deriveInsights(report: ChatReport): InsightDto[] {
  if (report.group || report.totals.messages < MIN_MESSAGES) return []
  const insights: (InsightDto | null)[] = []
  // The share of messages is a headline number of the report itself, not an insight.
  const { responses, sessions, facts, habits } = report

  if (sessions.totalSessions >= MIN_SESSIONS) {
    insights.push(shareInsight('initiative', responses.iWriteFirstPct))
    if (habits) insights.push(shareInsight('last_word', habits.lastWordMinePct))
  }

  const { medianMineSec: mine, medianTheirsSec: theirs } = responses
  if (
    mine !== null &&
    theirs !== null &&
    responses.mineSamples >= MIN_REPLIES &&
    responses.theirsSamples >= MIN_REPLIES
  ) {
    // Under a minute both sides are simply in the conversation.
    const fast = Math.max(Math.min(mine, theirs), 60)
    const slow = Math.max(mine, theirs, 60)
    const ratio = slow / fast
    if (ratio >= 1.5) {
      insights.push({
        id: 'reply_speed',
        side: mine <= theirs ? 'mine' : 'theirs',
        strength: clampNumber((ratio - 1) / 4, 0, 1),
        values: { ratio: roundTo(ratio, 1), fastSec: Math.min(mine, theirs), slowSec: Math.max(mine, theirs) },
      })
    }
  }

  if (habits) {
    for (const [id, counts, minTotal] of [
      ['double_texts', habits.doubleTexts, 10],
      // Runs of questions count once, as in the Questions card.
      ['questions', habits.questionTurns ?? habits.questions, 30],
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

  if (sessions.nightSessionsPct !== null && sessions.nightSessionsPct >= 25 && sessions.totalSessions >= MIN_SESSIONS) {
    insights.push({
      id: 'night_talks',
      side: 'both',
      strength: clampNumber(sessions.nightSessionsPct / 60, 0, 1) * 0.8,
      values: { pct: sessions.nightSessionsPct },
    })
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

  if (facts.maxStreak.days >= 14) {
    insights.push({
      id: 'streak',
      side: 'both',
      strength: clampNumber(facts.maxStreak.days / 120, 0, 1) * 0.7,
      values: { days: facts.maxStreak.days },
    })
  }

  if (facts.trend === 'growing' || facts.trend === 'fading') {
    insights.push({ id: 'trend', side: 'both', strength: 0.45, values: { trend: facts.trend } })
  }

  return insights
    .filter((insight): insight is InsightDto => insight !== null && insight.strength > 0)
    .map((insight) => ({ ...insight, strength: roundTo(insight.strength, 2) }))
    .sort((left, right) => right.strength - left.strength)
    .slice(0, MAX_INSIGHTS)
}

import type { DatedActivityDto } from '../api/types'
import { fillDailyGaps } from './activity'

/**
 * What a stretch of the chat was like, by volume only — never a judgement about the people:
 * the first stretch, the busiest one, other busy ones, an even pace, a calmer pace, near silence,
 * and the first stretch after a silence.
 */
export type ChapterKind = 'start' | 'peak' | 'active' | 'steady' | 'calm' | 'quiet' | 'return'

export interface ChapterDto {
  kind: ChapterKind
  /** First and last local day of the chapter, `YYYY-MM-DD`. */
  from: string
  to: string
  days: number
  messages: number
}

type Level = 'quiet' | 'low' | 'normal' | 'high'

interface Segment {
  level: Level
  months: { month: string; from: string; to: string; days: number; total: number }[]
}

/** Shorter chats have no chapters: three months is the least that reads as a story. */
export const MIN_CHAPTER_HISTORY_DAYS = 90
export const MAX_CHAPTERS = 5
/** A month this short (the first or the last one, cut by the period) joins its neighbour. */
const MIN_MONTH_DAYS = 7

const days = (segment: Segment) => segment.months.reduce((sum, month) => sum + month.days, 0)
const total = (segment: Segment) => segment.months.reduce((sum, month) => sum + month.total, 0)
const rate = (segment: Segment) => total(segment) / Math.max(1, days(segment))

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

/**
 * Splits the history into up to five chapters by how much the two of you wrote: months are
 * compared with the typical month of this chat, neighbours of the same level join, one-month
 * blips inside a longer stretch are smoothed away. Counted at read time from `activity.daily`,
 * so older reports get chapters without a new analysis. Empty when the chat is short or even.
 */
export function computeChapters(daily: readonly DatedActivityDto[]): ChapterDto[] {
  const filled = fillDailyGaps(daily)
  if (filled.length < MIN_CHAPTER_HISTORY_DAYS) return []

  const months: Segment['months'] = []
  for (const day of filled) {
    const month = day.date.slice(0, 7)
    const last = months[months.length - 1]
    if (last?.month === month) {
      last.to = day.date
      last.days += 1
      last.total += day.total
    } else months.push({ month, from: day.date, to: day.date, days: 1, total: day.total })
  }
  // A cut first or last month is too short to judge: it joins the month next to it.
  for (const index of [0, months.length - 1]) {
    const month = months[index]
    if (!month || month.days >= MIN_MONTH_DAYS || months.length < 2) continue
    const neighbour = months[index === 0 ? 1 : months.length - 2]!
    neighbour.from = index === 0 ? month.from : neighbour.from
    neighbour.to = index === 0 ? neighbour.to : month.to
    neighbour.days += month.days
    neighbour.total += month.total
    months.splice(index, 1)
  }

  const reference = median(months.map((month) => month.total / month.days))
  if (reference <= 0) return []
  const level = (value: number): Level =>
    value < reference * 0.15 ? 'quiet' : value < reference * 0.6 ? 'low' : value > reference * 1.5 ? 'high' : 'normal'

  let segments: Segment[] = []
  for (const month of months) {
    const current = level(month.total / month.days)
    const last = segments[segments.length - 1]
    if (last?.level === current) last.months.push(month)
    else segments.push({ level: current, months: [month] })
  }

  // A single month between two stretches of the same level is a blip, not a chapter; a silent month stays.
  for (let index = 1; index < segments.length - 1; index += 1) {
    const [before, blip, after] = [segments[index - 1]!, segments[index]!, segments[index + 1]!]
    if (blip.months.length > 1 || blip.level === 'quiet' || before.level !== after.level) continue
    before.months.push(...blip.months, ...after.months)
    segments.splice(index, 2)
    index -= 1
  }

  // Too many chapters: the shortest one joins the neighbour closest to it in pace.
  while (segments.length > MAX_CHAPTERS) {
    let shortest = 0
    segments.forEach((segment, index) => {
      if (days(segment) < days(segments[shortest]!)) shortest = index
    })
    const target = segments[shortest]!
    const left = segments[shortest - 1]
    const right = segments[shortest + 1]
    const into =
      !left || (right && Math.abs(rate(right) - rate(target)) < Math.abs(rate(left) - rate(target))) ? right! : left
    if (into === left) left.months.push(...target.months)
    else into.months.unshift(...target.months)
    segments.splice(shortest, 1)
    segments = segments.reduce<Segment[]>((merged, segment) => {
      const last = merged[merged.length - 1]
      if (last?.level === segment.level) last.months.push(...segment.months)
      else merged.push(segment)
      return merged
    }, [])
  }
  if (segments.length < 2) return []

  const busiest = segments.reduce((best, segment) => (rate(segment) > rate(best) ? segment : best))
  return segments.map((segment, index) => {
    const previous = segments[index - 1]
    const kind: ChapterKind =
      segment.level === 'quiet'
        ? 'quiet'
        : segment.level === 'high'
          ? segment === busiest
            ? 'peak'
            : 'active'
          : previous?.level === 'quiet'
            ? 'return'
            : index === 0
              ? 'start'
              : segment.level === 'low'
                ? 'calm'
                : 'steady'
    return {
      kind,
      from: segment.months[0]!.from,
      to: segment.months[segment.months.length - 1]!.to,
      days: days(segment),
      messages: total(segment),
    }
  })
}

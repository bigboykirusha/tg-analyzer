import type { ChatReport, ReportSnapshotDto } from '../api/types'
import { createZonedClock } from './zoned-clock'

const DAY_MS = 86_400_000
/** Fewer new messages than this say nothing about a change of pace or share. */
export const MIN_NEW_MESSAGES = 30

export interface ReportChanges {
  /** Net increase in the message counter; not a count of new IDs. */
  added: number
  /** Complete local days between analyses, including days without messages. */
  days: number
  /** Messages per calendar day before and since. */
  pace: { before: number; since: number } | null
  /** Your share of messages in equally long windows before and after the previous analysis day. */
  share: { before: number; since: number } | null
}

function dayNumber(date: string) {
  return Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / DAY_MS)
}

/** Compare equally long complete local-day windows, excluding both analysis days.
 * Without an observation date or enough baseline history, comparisons are unavailable.
 * `added` remains a net counter difference: deletions can mask new messages.
 */
export function compareWithPrevious(
  report: ChatReport,
  previous: ReportSnapshotDto,
  analyzedAt?: string,
): ReportChanges {
  const added = Math.max(0, report.totals.messages - previous.messages)
  const unavailable: ReportChanges = { added, days: 0, pace: null, share: null }
  const previousTime = Date.parse(previous.analyzedAt)
  const currentTime = analyzedAt ? Date.parse(analyzedAt) : NaN
  if (!Number.isFinite(previousTime) || !Number.isFinite(currentTime) || currentTime <= previousTime) return unavailable
  const clock = createZonedClock(report.timeZone ?? 'UTC')
  const cutoff = dayNumber(clock(previousTime).day)
  const end = dayNumber(clock(currentTime).day)
  const days = Math.max(0, end - cutoff - 1)
  const result = { ...unavailable, days }
  if (!days || !report.period.firstMessageAt) return result
  const baselineStart = cutoff - days
  const firstTime = Date.parse(report.period.firstMessageAt)
  if (!Number.isFinite(firstTime) || dayNumber(clock(firstTime).day) > baselineStart) return result
  const before = { sent: 0, total: 0 }
  const since = { sent: 0, total: 0 }
  for (const day of report.activity.daily) {
    const date = dayNumber(day.date)
    const bucket = date >= baselineStart && date < cutoff ? before : date > cutoff && date < end ? since : null
    if (bucket) {
      bucket.sent += day.sent
      bucket.total += day.total
    }
  }
  if (before.total < MIN_NEW_MESSAGES || since.total < MIN_NEW_MESSAGES) return result
  return {
    added,
    days,
    pace: { before: before.total / days, since: since.total / days },
    share: { before: (before.sent / before.total) * 100, since: (since.sent / since.total) * 100 },
  }
}

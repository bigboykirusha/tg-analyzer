import type { ChatReport, ReportSnapshotDto } from '../api/types'

const DAY_MS = 86_400_000
/** Fewer new messages than this say nothing about a change of pace or share. */
export const MIN_NEW_MESSAGES = 30

export interface ReportChanges {
  /** Messages after the previous analysis. */
  added: number
  /** Calendar days from the previous analysis to the last message now. */
  days: number
  /** Messages per calendar day before and since. */
  pace: { before: number; since: number } | null
  /** Your share of messages, %, over the whole chat before and over the new days alone. */
  share: { before: number; since: number } | null
}

function dayNumber(date: string) {
  return Math.floor(Date.parse(`${date.slice(0, 10)}T00:00:00Z`) / DAY_MS)
}

/**
 * What happened since the previous analysis, measured on the new days alone:
 * a week of messages barely moves the all-time numbers, so comparing them
 * would almost always say «nothing changed».
 */
export function compareWithPrevious(report: ChatReport, previous: ReportSnapshotDto): ReportChanges {
  const added = Math.max(0, report.totals.messages - previous.messages)
  const cutoff = dayNumber(previous.analyzedAt)
  const first = report.period.firstMessageAt
  const last = report.period.lastMessageAt
  const days = last ? Math.max(0, dayNumber(last) - cutoff) : 0

  let sent = 0
  let total = 0
  for (const day of report.activity.daily) {
    if (dayNumber(day.date) <= cutoff) continue
    sent += day.sent
    total += day.total
  }

  const enough = added >= MIN_NEW_MESSAGES && total >= MIN_NEW_MESSAGES
  const daysBefore = first ? Math.max(1, cutoff - dayNumber(first) + 1) : 0
  const pace =
    enough && days > 0 && daysBefore > 0
      ? { before: previous.messages / daysBefore, since: added / Math.max(days, 1) }
      : null
  const share =
    enough && previous.messages
      ? { before: (previous.sent / previous.messages) * 100, since: (sent / total) * 100 }
      : null
  return { added, days, pace, share }
}

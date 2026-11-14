import type { ChatReport, DatedActivityDto, ReportHeadlineDto } from '../api/types'
import { roundTo } from './primitives'

const DAY_MS = 24 * 60 * 60 * 1000

function dayNumber(date: string) {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS)
}

/**
 * Sent and received messages per week for the last `weeks` weeks of a chat,
 * oldest first. Weeks are counted back from the chat's last active day, so a
 * chat that went quiet a year ago still shows its own rhythm. Short chats get
 * fewer weeks rather than a row of empty ones.
 */
export function weeklyPulse(daily: readonly DatedActivityDto[], weeks = 26): { sent: number; received: number }[] {
  if (!daily.length || weeks <= 0) return []
  const days = daily.map((item) => ({ ...item, day: dayNumber(item.date) })).filter((item) => Number.isFinite(item.day))
  if (!days.length) return []
  const last = Math.max(...days.map((item) => item.day))
  const first = Math.min(...days.map((item) => item.day))
  const count = Math.min(weeks, Math.floor((last - first) / 7) + 1)
  const buckets = Array.from({ length: count }, () => ({ sent: 0, received: 0 }))
  for (const item of days) {
    const weeksAgo = Math.floor((last - item.day) / 7)
    if (weeksAgo >= count) continue
    const bucket = buckets[count - 1 - weeksAgo]!
    bucket.sent += item.sent
    bucket.received += item.received
  }
  return buckets
}

/** The most columns a reading pulse sends: the finest a tile or the analysis sheet draws, a few kilobytes a tick. */
export const READING_PULSE_COLUMNS = 120

/**
 * The pulse of an analysis while it reads: every week read so far (the history is read from today back), oldest
 * first, folded into at most `columns` groups. Groups are counted from the newest week, so the end already drawn
 * keeps its shape while older weeks arrive.
 */
export function readingPulse(
  daily: readonly DatedActivityDto[],
  columns = READING_PULSE_COLUMNS,
): { sent: number; received: number }[] {
  const weeks = weeklyPulse(daily, Number.POSITIVE_INFINITY)
  const size = Math.max(1, Math.ceil(weeks.length / Math.max(1, columns)))
  if (size === 1) return weeks
  const out: { sent: number; received: number }[] = []
  for (let end = weeks.length; end > 0; end -= size) {
    const group = { sent: 0, received: 0 }
    for (const week of weeks.slice(Math.max(0, end - size), end)) {
      group.sent += week.sent
      group.received += week.received
    }
    out.unshift(group)
  }
  return out
}

/** The few numbers an overview of many chats compares side by side. */
export function reportHeadline(report: Pick<ChatReport, 'totals' | 'responses'>): ReportHeadlineDto {
  const { sent, messages } = report.totals
  return {
    sentSharePct: messages > 0 ? roundTo((sent / messages) * 100, 1) : null,
    iWriteFirstPct: report.responses.iWriteFirstPct ?? null,
    medianMineSec: report.responses.medianMineSec ?? null,
    medianTheirsSec: report.responses.medianTheirsSec ?? null,
  }
}

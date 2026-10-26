import type { ChatReport, DatedActivityDto, ReportHeadlineDto, ReportSummaryDto } from '../api/types'
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

/** One person (or group) picked out of the user's reports for the home page. */
export interface CircleHighlight {
  chatId: string
  title: string
  value: number
}

/** What all of the user's reports say together: the home page's summary. */
export interface CircleSummary {
  chats: number
  people: number
  groups: number
  totalMessages: number
  sentMessages: number | null
  /** Weekly totals of all chats, aligned on each chat's last week, oldest first. */
  pulse: { sent: number; received: number }[]
  /** The private chat with the most messages. */
  mostMessages: CircleHighlight | null
  /** The person whose usual reply time is shortest (seconds). */
  fastestReply: CircleHighlight | null
  /** The person you most often start conversations with (percent). */
  youStartMost: CircleHighlight | null
  /** The person who most often starts conversations with you (percent you start). */
  theyStartMost: CircleHighlight | null
}

type CircleReport = Pick<ReportSummaryDto, 'chatId' | 'title' | 'type' | 'totalMessages' | 'pulse' | 'headline'>

function pick(
  reports: readonly CircleReport[],
  value: (report: CircleReport) => number | null,
  better: (a: number, b: number) => boolean,
): CircleHighlight | null {
  let best: CircleHighlight | null = null
  for (const report of reports) {
    const current = value(report)
    if (current === null || !Number.isFinite(current)) continue
    if (!best || better(current, best.value)) best = { chatId: report.chatId, title: report.title, value: current }
  }
  return best
}

/**
 * Sums up every report the user has. People-level picks use private chats
 * only, since a group has no single «other side». A pick needs at least two
 * people to compare, otherwise it would only restate the one report.
 */
export function summarizeCircle(reports: readonly CircleReport[], weeks = 26): CircleSummary {
  const people = reports.filter((report) => report.type === 'private')
  const groups = reports.filter((report) => report.type !== 'private').length
  const length = Math.min(weeks, Math.max(0, ...reports.map((report) => report.pulse.length)))
  const pulse = Array.from({ length }, () => ({ sent: 0, received: 0 }))
  for (const report of reports) {
    const tail = report.pulse.slice(-length)
    tail.forEach((week, index) => {
      const bucket = pulse[length - tail.length + index]!
      bucket.sent += week.sent
      bucket.received += week.received
    })
  }
  let sentMessages: number | null = null
  for (const report of people) {
    const share = report.headline.sentSharePct
    if (share === null) continue
    sentMessages = (sentMessages ?? 0) + Math.round((report.totalMessages * share) / 100)
  }
  const comparable = people.length >= 2 ? people : []
  return {
    chats: reports.length,
    people: people.length,
    groups,
    totalMessages: reports.reduce((sum, report) => sum + report.totalMessages, 0),
    sentMessages,
    pulse,
    mostMessages: pick(
      comparable,
      (report) => report.totalMessages,
      (a, b) => a > b,
    ),
    fastestReply: pick(
      comparable,
      (report) => report.headline.medianTheirsSec,
      (a, b) => a < b,
    ),
    youStartMost: pick(
      comparable,
      (report) => report.headline.iWriteFirstPct,
      (a, b) => a > b,
    ),
    theyStartMost: pick(
      comparable,
      (report) => report.headline.iWriteFirstPct,
      (a, b) => a < b,
    ),
  }
}

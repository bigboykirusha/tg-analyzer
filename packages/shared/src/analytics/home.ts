import type { RecentActivityResponse, ReportSummaryDto, UserShareLinkDto } from '../api/types'
import { MILESTONES } from './chat-report'

/**
 * One line of «Главное» on the home screen. Each one comes from data the app already has: the last
 * 30 days counted by Telegram, the stored report summaries and the user's quiz links.
 */
export type HomeEvent =
  | {
      kind: 'month'
      messages: number
      chats: number
      /** Your share of those messages, 0–100. */
      minePct: number | null
      /** The chats with the most messages, for the split bar. */
      top: { chatId: string; title: string; messages: number }[]
    }
  | { kind: 'new'; chatId: string; title: string; added: number; analyzedAt: string }
  | { kind: 'quiz'; chatId: string; title: string; score: number; total: number }
  | { kind: 'milestone'; chatId: string; title: string; index: number; days: number }
  | { kind: 'unanalysed'; chatId: string; title: string; messages: number; place: number }

/** Fewer new messages than this are not news. */
export const HOME_MIN_NEW_MESSAGES = 50
/** Further than this is a guess, not a forecast. */
const MAX_FORECAST_DAYS = 60
const PACE_WEEKS = 4

/**
 * «Главное» in a fixed order — the month, then what changed in a report, the quiz answer, the next
 * round-number message and the busiest chat without a report — each at most once, each only when
 * there is something to say.
 */
export function deriveHomeEvents(
  reports: readonly ReportSummaryDto[],
  recent: RecentActivityResponse | null,
  links: readonly UserShareLinkDto[] = [],
): HomeEvent[] {
  const events: HomeEvent[] = []
  const byId = new Map(reports.map((report) => [report.chatId, report]))
  const chats = recent?.chats ?? []

  if (chats.length) {
    const messages = chats.reduce((sum, chat) => sum + chat.messages, 0)
    const mine = chats.reduce((sum, chat) => sum + chat.mine, 0)
    events.push({
      kind: 'month',
      messages,
      chats: chats.length,
      minePct: messages ? Math.round((mine / messages) * 100) : null,
      top: chats.slice(0, 5).map((chat) => ({ chatId: chat.id, title: chat.title, messages: chat.messages })),
    })
  }

  // The report the most messages ago: Telegram tells the chat's size without reading it.
  const stale = chats
    .map((chat) => {
      const report = byId.get(chat.id)
      return report && chat.total !== undefined ? { report, added: chat.total - report.totalMessages } : null
    })
    .filter((item): item is { report: ReportSummaryDto; added: number } =>
      Boolean(item && item.added >= HOME_MIN_NEW_MESSAGES),
    )
    .sort((a, b) => b.added - a.added)[0]
  if (stale)
    events.push({
      kind: 'new',
      chatId: stale.report.chatId,
      title: stale.report.title,
      added: stale.added,
      analyzedAt: stale.report.analyzedAt,
    })

  // The newest quiz answer the other side agreed to show.
  const answered = links.find((link) => link.kind === 'quiz' && link.result?.score !== null && link.result)
  if (answered?.result && answered.result.score !== null)
    events.push({
      kind: 'quiz',
      chatId: answered.chatId,
      title: answered.title,
      score: answered.result.score,
      total: answered.result.total,
    })

  // The soonest round-number message of any private chat, at the pace of its last four weeks.
  const sizes = new Map(chats.map((chat) => [chat.id, chat.total]))
  const forecasts = reports
    .filter((report) => report.type === 'private')
    .map((report) => {
      const total = sizes.get(report.chatId) ?? report.totalMessages
      const index = MILESTONES.find((value) => value > total)
      const weeks = report.pulse.slice(-PACE_WEEKS)
      const perDay = weeks.reduce((sum, week) => sum + week.sent + week.received, 0) / (weeks.length * 7 || 1)
      if (index === undefined || perDay <= 0) return null
      return { report, index, days: Math.ceil((index - total) / perDay) }
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item && item.days <= MAX_FORECAST_DAYS))
    .sort((a, b) => a.days - b.days)
  const soonest = forecasts[0]
  if (soonest)
    events.push({
      kind: 'milestone',
      chatId: soonest.report.chatId,
      title: soonest.report.title,
      index: soonest.index,
      days: soonest.days,
    })

  // The busiest chat of the month that has no report yet.
  const place = chats.findIndex((chat) => !byId.has(chat.id))
  const waiting = chats[place]
  if (waiting)
    events.push({
      kind: 'unanalysed',
      chatId: waiting.id,
      title: waiting.title,
      messages: waiting.messages,
      place: place + 1,
    })

  return events
}

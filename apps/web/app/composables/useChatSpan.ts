import { fillDailyGaps, shouldShowYear, type ReportDto } from '@tg-analyzer/shared'
import { nbsp } from '../lib/nbsp'

const NBSP = ' '

/**
 * «4 800 сообщений · май — ноябрь 2026» (a group adds «8 участников» in the middle): how much was written over
 * which months, with the year on both ends when the chat spans more than one (`shouldShowYear`). One line for the
 * poster, the link's preview and the guest's poster, so the same fact reads the same everywhere.
 */
export function useChatSpan() {
  const { tc, formatNumber, formatDay } = useI18n()
  return (data: ReportDto) => {
    const report = data.report
    const messages = nbsp(
      tc('common.messagesCount', report.totals.messages, { count: formatNumber(report.totals.messages) }),
    )
    const head = report.group
      ? `${messages} · ${nbsp(tc('report.poster.members', report.group.participants.length))}`
      : messages
    const days = fillDailyGaps(report.activity.daily)
    const first = days[0]?.date
    const last = days.at(-1)?.date
    if (!first || !last) return head
    const month = (day: string, year: boolean) =>
      formatDay(day, year ? { month: 'long', year: 'numeric' } : { month: 'long' }).replace(/\s?г\.$/u, '')
    const span =
      first.slice(0, 7) === last.slice(0, 7)
        ? month(last, true)
        : `${month(first, shouldShowYear(first, last))}${NBSP}— ${month(last, true)}`
    return `${head} · ${span}`
  }
}

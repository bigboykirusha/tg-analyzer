import { reportChatSpan, shouldShowYear, type ChatSpanDto, type ReportDto } from '@tg-analyzer/shared'
import { nbsp } from '../lib/nbsp'

const NBSP = ' '

/**
 * «4 800 сообщений · май — ноябрь 2026» (a group adds «8 участников» in the middle): how much was written over
 * which months, with the year on both ends when the chat spans more than one (`shouldShowYear`). One line for the
 * poster, the link's preview and the guest's poster, so the same fact reads the same everywhere.
 */
export function useChatSpanParts() {
  const { tc, formatNumber, formatDay } = useI18n()
  return ({ messages: count, participants, firstDay: first, lastDay: last }: ChatSpanDto) => {
    const messages = nbsp(tc('common.messagesCount', count, { count: formatNumber(count) }))
    const members = participants === null ? null : nbsp(tc('report.poster.members', participants))
    if (!first || !last) return { messages, members, period: null }
    const month = (day: string, year: boolean) =>
      formatDay(day, year ? { month: 'long', year: 'numeric' } : { month: 'long' }).replace(/\s?г\.$/u, '')
    const period =
      first.slice(0, 7) === last.slice(0, 7)
        ? month(last, true)
        : `${month(first, shouldShowYear(first, last))}${NBSP}— ${month(last, true)}`
    return { messages, members, period }
  }
}

export function useFormatChatSpan() {
  const parts = useChatSpanParts()
  return (span: ChatSpanDto) => {
    const { messages, members, period } = parts(span)
    return [messages, members, period].filter(Boolean).join(' · ')
  }
}

export function useChatSpan() {
  const format = useFormatChatSpan()
  return (data: ReportDto) => format(reportChatSpan(data.report))
}

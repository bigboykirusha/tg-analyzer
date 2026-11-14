import { isEven, type ReportDto } from '@tg-analyzer/shared'
import { nbsp } from '../lib/nbsp'

export interface BalanceRow {
  key: string
  label: string
  mine: number
  theirs: number
  left: string
  right: string
}

/**
 * «Баланс»: the one place that decides who carries a chat and says so. The report card, the guest's page
 * and the «Итоги» frame all read it, so the answer, the figure and the three rows are the same everywhere.
 * Parity is `isEven` (a lead under 1.25×); a row without enough behind it is left out. Told in the
 * second person by default («Пишете на равных»); with an `author` it is the third («Мила и Аня пишут на равных»),
 * for a reader who is the other side.
 */
export function useBalance(data: () => ReportDto, author: () => string | null = () => null) {
  const { t, formatNumber, formatDuration, formatPercent } = useI18n()

  const name = computed(() => data().summary.title)
  /** The left side's name: «Вы» or the author. */
  const me = computed(() => author() ?? t('report.you'))
  const totals = computed(() => data().report.totals)

  /** How many times more the leader writes, to a tenth («×1,8»); ten and up are whole. */
  const times = (ratio: number) => `×${formatNumber(ratio >= 10 ? Math.round(ratio) : Math.round(ratio * 10) / 10)}`

  const lead = computed(() => {
    const { sent, received } = totals.value
    if (!sent && !received) return null
    if (isEven(sent, received)) return { even: true as const }
    const ratio = Math.max(sent, received) / Math.max(1, Math.min(sent, received))
    return { even: false as const, figure: times(ratio), mine: sent > received }
  })

  const answer = computed(() => {
    const item = lead.value
    if (!item) return null
    const other = name.value
    const writer = author()
    if (writer) {
      if (item.even) return t('publicReport.even', { me: writer, name: other })
      return t('publicReport.writesMore', { name: item.mine ? writer : other })
    }
    if (item.even) return t('report.balance.even')
    return item.mine ? t('report.balance.mine') : t('report.balance.theirs', { name: other })
  })
  const figure = computed(() => (lead.value && !lead.value.even ? lead.value.figure : null))
  /** The card's big figure: the ratio («×1,8»), or the split itself when about even («52 на 48»). */
  const headline = computed(() => {
    if (figure.value) return figure.value
    const { sent, received } = totals.value
    if (!sent && !received) return null
    const mine = Math.round((100 * sent) / (sent + received))
    return t('report.main.split', { mine, theirs: 100 - mine })
  })
  /** Your share of the messages, 0–100. */
  const share = computed(() => (totals.value.sent / Math.max(1, totals.value.messages)) * 100)

  const rows = computed<BalanceRow[]>(() => {
    const { sent, received, messages } = totals.value
    const out: BalanceRow[] = [
      {
        key: 'messages',
        label: t('report.balance.messages'),
        mine: sent,
        theirs: received,
        left: formatPercent((sent / Math.max(1, messages)) * 100),
        right: formatPercent((received / Math.max(1, messages)) * 100),
      },
    ]
    const { medianMineSec: mineSec, medianTheirsSec: theirsSec, iWriteFirstPct } = data().report.responses
    // The bar of the reply time is the share of speed: the faster side has the longer part.
    if (mineSec && theirsSec)
      out.push({
        key: 'speed',
        label: t('report.balance.speed'),
        mine: 1 / mineSec,
        theirs: 1 / theirsSec,
        left: nbsp(formatDuration(mineSec)),
        right: nbsp(formatDuration(theirsSec)),
      })
    if (iWriteFirstPct !== null && !data().derived.habitRows.skipped.includes('starts'))
      out.push({
        key: 'starts',
        label: t('report.balance.starts'),
        mine: iWriteFirstPct,
        theirs: 100 - iWriteFirstPct,
        left: formatPercent(iWriteFirstPct),
        right: formatPercent(100 - iWriteFirstPct),
      })
    return out
  })

  return { name, me, answer, figure, headline, share, rows }
}

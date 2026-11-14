import { fillDailyGaps, type ReportDto } from '@tg-analyzer/shared'

/**
 * «Дней подряд»: the longest run of days with a message, told only when it is a week or more. The calendar
 * card (`ReportDays`) and the «Итоги» frame read this one function, so the run is said the same way in both.
 * `enabled` switches it off where the report does not tell the run (a group). Null when there is nothing to say.
 */
export function useStreak(data: () => ReportDto, enabled: () => boolean = () => true) {
  const { t, tc, formatNumber, formatDay } = useI18n()
  const day = (value: string | null) => (value ? formatDay(value.slice(0, 10), { day: 'numeric', month: 'long' }) : '')

  return computed(() => {
    const best = data().report.facts.maxStreak
    if (!enabled() || !best || best.days < 7) return null
    const all = best.days >= fillDailyGaps(data().report.activity.daily).length
    return {
      days: best.days,
      figure: tc('report.habits.days', best.days, { count: formatNumber(best.days) }),
      answer: all
        ? t('report.main.streakAll')
        : t('report.main.streakFrom', { from: day(best.startDate), to: day(best.endDate) }),
      all,
    }
  })
}

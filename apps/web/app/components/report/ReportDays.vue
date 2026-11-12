<script setup lang="ts">
import { fillDailyGaps, type ReportDto } from '@tg-analyzer/shared'
import { CalendarDays, Flame } from '../../lib/icons'

/**
 * «Активность по дням»: every day of the period as a calendar, and the seven days of the week as bars.
 * The answers say how many days you were in touch and which weekday is the busiest. Private chats and
 * groups read the same two cards. `streak` (a private chat): a run of a week and more turns the calendar into the
 * part's poster — «Дней подряд», the run as its figure, the days you wrote to each other under the calendar —
 * so the run and the count of days are told once, in one place.
 */
const props = defineProps<{ data: ReportDto; streak?: boolean }>()
const { t, tc, formatNumber, formatDay } = useI18n()
const days = computed(() => fillDailyGaps(props.data.report.activity.daily))
const weekday = computed(() => props.data.report.activity.weekday)

const activeDays = computed(() => {
  const total = days.value.length
  if (total < 2) return null
  return tc('report.rhythm.activeDays', total, {
    active: formatNumber(days.value.filter((day) => day.total > 0).length),
  })
})
const day = (value: string | null) => (value ? formatDay(value.slice(0, 10), { day: 'numeric', month: 'long' }) : '')
const run = computed(() => {
  const best = props.data.report.facts.maxStreak
  if (!props.streak || !best || best.days < 7) return null
  const all = best.days >= days.value.length
  return {
    figure: tc('report.habits.days', best.days, { count: formatNumber(best.days) }),
    answer: all
      ? t('report.main.streakAll')
      : t('report.main.streakFrom', { from: day(best.startDate), to: day(best.endDate) }),
    all,
  }
})
const busiestDay = computed(() => {
  let best = -1
  weekday.value.forEach((count, index) => {
    if (count.total > 0 && (best < 0 || count.total > weekday.value[best]!.total)) best = index
  })
  return best < 0 ? null : t('group.time.busiestDay', { day: t('chart.weekdaysLong').split(',')[best] ?? '' })
})
</script>

<template>
  <ReportSection
    v-if="activeDays && run"
    wide
    tone="ink"
    :icon="Flame"
    :title="t('report.main.streakTitle')"
    :figure="run.figure"
    :answer="run.answer"
  >
    <ActivityHeatmap :points="days" />
    <template v-if="!run.all" #note>{{ activeDays }}</template>
  </ReportSection>
  <ReportSection
    v-else-if="activeDays"
    wide
    :icon="CalendarDays"
    :title="t('report.rhythm.heatmapTitle')"
    :answer="activeDays"
  >
    <ActivityHeatmap :points="days" />
  </ReportSection>
  <ReportSection
    v-if="busiestDay"
    wide
    :icon="CalendarDays"
    :title="t('report.rhythm.weekdaysTitle')"
    :answer="busiestDay"
  >
    <WeekdayChart :weekday="weekday" />
  </ReportSection>
</template>

<script setup lang="ts">
import { fillDailyGaps, type ReportDto } from '@tg-analyzer/shared'
import { CalendarDays } from '../../lib/icons'

/**
 * «Активность по дням»: every day of the period as a calendar, and the seven days of the week as bars.
 * The answers say how many days you were in touch and which weekday is the busiest. Private chats and
 * groups read the same two cards.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber } = useI18n()
const days = computed(() => fillDailyGaps(props.data.report.activity.daily))
const weekday = computed(() => props.data.report.activity.weekday)

const activeDays = computed(() => {
  const total = days.value.length
  if (total < 2) return null
  return tc('report.rhythm.activeDays', total, {
    active: formatNumber(days.value.filter((day) => day.total > 0).length),
  })
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
    v-if="activeDays"
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

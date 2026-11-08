<script setup lang="ts">
import { fillDailyGaps, type ReportDto } from '@tg-analyzer/shared'

const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber } = useI18n()
const days = computed(() => fillDailyGaps(props.data.report.activity.daily))
const activity = computed(() => props.data.report.activity)

/** One sentence per card, as in a private report: the fact the chart shows best. */
const activeDays = computed(() => {
  const total = days.value.length
  if (!total) return undefined
  return tc('group.time.activeDays', total, {
    active: formatNumber(days.value.filter((day) => day.total > 0).length),
  })
})
function busiest(counts: { total: number }[]) {
  let best = -1
  counts.forEach((count, index) => {
    if (count.total > 0 && (best < 0 || count.total > counts[best]!.total)) best = index
  })
  return best
}
const busiestDay = computed(() => {
  const day = busiest(activity.value.weekday)
  return day < 0 ? undefined : t('group.time.busiestDay', { day: t('chart.weekdaysLong').split(',')[day] ?? '' })
})
const peakHour = computed(() => {
  const hour = busiest(activity.value.hourly)
  if (hour < 0) return undefined
  const pad = (value: number) => `${String(value % 24).padStart(2, '0')}:00`
  return t('group.time.peakHour', { from: pad(hour), to: pad(hour + 1) })
})
</script>

<template>
  <div class="report-grid">
    <ReportSection wide :title="t('report.rhythm.heatmapTitle')" :answer="activeDays">
      <ActivityHeatmap :points="days" />
    </ReportSection>
    <!-- Volume over time is the pulse on the poster: no line chart repeats it here. -->
    <ReportSection wide :title="t('report.rhythm.weekdaysTitle')" :answer="busiestDay">
      <WeekdayChart :weekday="data.report.activity.weekday" />
    </ReportSection>
    <ReportSection wide :title="t('group.hoursTitle')" :answer="peakHour">
      <HourlyChart :hourly="data.report.activity.hourly" />
    </ReportSection>
  </div>
</template>

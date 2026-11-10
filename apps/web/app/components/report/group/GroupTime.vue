<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * «Время» in a group: the 24 hours with the liveliest one lit; the busiest day of the week is one line
 * under them. No calendar — the pulse on the poster shows the rhythm in time.
 */
const props = defineProps<{ data: ReportDto }>()
const { t } = useI18n()
const activity = computed(() => props.data.report.activity)

function busiest(counts: { total: number }[]) {
  let best = -1
  counts.forEach((count, index) => {
    if (count.total > 0 && (best < 0 || count.total > counts[best]!.total)) best = index
  })
  return best
}
const busiestDay = computed(() => {
  const day = busiest(activity.value.weekday)
  return day < 0 ? null : t('group.time.busiestDay', { day: t('chart.weekdaysLong').split(',')[day] ?? '' })
})
const peakHour = computed(() => {
  const hour = busiest(activity.value.hourly)
  if (hour < 0) return null
  const pad = (value: number) => `${String(value % 24).padStart(2, '0')}:00`
  return t('group.time.peakHour', { from: pad(hour), to: pad(hour + 1) })
})
</script>

<template>
  <ReportSection v-if="peakHour" id="part-time" :title="t('report.time.title')" :answer="peakHour">
    <HourlyChart :hourly="activity.hourly" />
    <template v-if="busiestDay" #note>{{ busiestDay }}</template>
  </ReportSection>
</template>

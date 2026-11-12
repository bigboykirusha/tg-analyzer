<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { parseWindow } from '../../../lib/persona'
import { Clock } from '../../../lib/icons'

/**
 * «Время» in a group: the 24 hours with the usual window lit — `derived.availabilityProfile.peakWindow`,
 * the same answer as a private report and «Итоги»; the busiest day of the week is one line under them.
 * No calendar — the pulse on the poster shows the rhythm in time.
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
const window = computed(() => parseWindow(props.data.derived.availabilityProfile.peakWindow))
const peakHours = computed(() => {
  const peak = window.value
  return peak ? Array.from({ length: peak.length }, (_, index) => (peak.start + index) % 24) : []
})
/** «Пик — с 11:00 до 14:00», the dash held to its numbers. */
const answer = computed(() =>
  window.value ? t('report.time.peak', { from: window.value.from, to: window.value.to }).replace(/–/gu, '⁠–⁠') : null,
)
</script>

<template>
  <ReportSection v-if="answer" id="part-time" :icon="Clock" :title="t('report.time.title')" :answer="answer">
    <HourlyChart :hourly="activity.hourly" :peak="peakHours" />
    <template v-if="busiestDay" #note>{{ busiestDay }}</template>
  </ReportSection>
</template>

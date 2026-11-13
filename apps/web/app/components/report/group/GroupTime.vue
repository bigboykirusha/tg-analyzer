<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { parseWindow } from '../../../lib/persona'
import { Clock } from '../../../lib/icons'

/**
 * «Время» in a group: the 24 hours with the usual window lit — `derived.availabilityProfile.peakWindow`,
 * the same answer as a private report and «Итоги». The busiest day of the week is the answer of the week's own
 * card right under this one (ReportDays), so it is not said here a second time.
 */
const props = defineProps<{ data: ReportDto }>()
const { t } = useI18n()
const activity = computed(() => props.data.report.activity)

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
  </ReportSection>
</template>

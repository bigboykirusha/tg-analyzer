<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Clock } from '../../../lib/icons'

/**
 * «Время» in a group: the 24 hours with the usual window lit — `derived.availabilityProfile.peakWindow`,
 * the same answer as a private report and «Итоги». The busiest day of the week is the answer of the week's own
 * card right under this one (ReportDays), so it is not said here a second time.
 */
const props = defineProps<{ data: ReportDto }>()
const { t } = useI18n()
const activity = computed(() => props.data.report.activity)

const { hours: peakHours, second: secondHours, answer } = usePeakWindow(() => props.data)
</script>

<template>
  <ReportSection v-if="answer" id="part-time" :icon="Clock" :title="t('report.time.title')" :answer="answer">
    <HourlyChart :hourly="activity.hourly" :peak="peakHours" :second="secondHours" />
  </ReportSection>
</template>

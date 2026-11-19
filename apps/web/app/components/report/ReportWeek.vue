<script setup lang="ts">
import type { DirectionalCountDto } from '@tg-analyzer/shared'
import { CalendarDays } from '../../lib/icons'

const props = defineProps<{ weekday: DirectionalCountDto[]; heatmap?: number[] }>()
const { t, tc, locale, formatNumber } = useI18n()

const peak = computed(() => Math.max(0, ...props.weekday.map((day) => day.total)))
const peakDays = computed(() => {
  const names = t('chart.weekdaysLong').split(',')
  return props.weekday.flatMap((day, index) => (day.total === peak.value && names[index] ? [names[index]] : []))
})
const answer = computed(() =>
  peakDays.value.length === 7
    ? t('report.rhythm.weekdaysEven')
    : t('report.rhythm.weekdaysPeak', { days: new Intl.ListFormat(locale.value).format(peakDays.value) }),
)
const note = computed(() =>
  t(peakDays.value.length === 1 ? 'report.rhythm.weekdaysPeakCount' : 'report.rhythm.weekdaysTiedCount', {
    count: tc('common.messagesCount', peak.value, { count: formatNumber(peak.value) }),
  }),
)
</script>

<template>
  <ReportSection
    v-if="peak"
    id="part-week"
    :icon="CalendarDays"
    :title="t('report.rhythm.weekdaysTitle')"
    :answer="answer"
  >
    <WeekHourChart v-if="heatmap?.length === 7 * 24 && heatmap.some(Boolean)" :heatmap="heatmap" />
    <WeekdayChart v-else :weekday="weekday" />
    <template #note>{{ note }}</template>
  </ReportSection>
</template>

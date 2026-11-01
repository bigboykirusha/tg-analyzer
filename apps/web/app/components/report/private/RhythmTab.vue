<script setup lang="ts">
import { fillDailyGaps, type ReportDto } from '@tg-analyzer/shared'

const props = defineProps<{ data: ReportDto }>()
const { t } = useI18n()

const report = computed(() => props.data.report)
const days = computed(() => fillDailyGaps(report.value.activity.daily))

/** «Usually 21:00–00:00, mostly on Fridays» from the hourly and weekday totals. */
const usually = computed(() => {
  const profile = props.data.derived.availabilityProfile
  if (!profile.peakWindow) return null
  const [from = '', to = ''] = profile.peakWindow.split('-')
  const weekday = report.value.activity.weekday
  const busiest = weekday.reduce((best, value, index) => (value.total > (weekday[best]?.total ?? 0) ? index : best), 0)
  const day = weekday[busiest]?.total ? (t('chart.weekdaysLong').split(',')[busiest] ?? '') : ''
  const [secondFrom = '', secondTo = ''] = profile.secondaryWindow?.split('-') ?? []
  return {
    main: day ? t('report.rhythm.usuallyWithDay', { from, to, day }) : t('report.rhythm.usually', { from, to }),
    second: profile.secondaryWindow ? t('report.rhythm.alsoActive', { from: secondFrom, to: secondTo }) : null,
  }
})
const usuallyText = computed(() =>
  usually.value ? [usually.value.main, usually.value.second].filter(Boolean).join(' ') : '',
)
</script>

<template>
  <ReportSection :title="t('report.rhythm.heatmapTitle')" :text="t('report.rhythm.heatmapText')" wide>
    <ActivityHeatmap :points="days" />
  </ReportSection>

  <!-- When you are usually around reads as the caption of the day parts, not a card of its own. -->
  <ReportSection :title="t('report.rhythm.dayPartsTitle')" :text="usuallyText">
    <DayPartsChart :distribution="data.derived.activityDistribution" />
  </ReportSection>

  <ReportSection :title="t('report.rhythm.weekdaysTitle')">
    <WeekdayChart :weekday="report.activity.weekday" />
  </ReportSection>

  <ReportSection :title="t('report.rhythm.hoursTitle')">
    <HourlyChart :hourly="report.activity.hourly" :received-label="data.summary.title" />
  </ReportSection>
</template>

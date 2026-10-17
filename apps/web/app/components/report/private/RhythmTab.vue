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
    scattered: profile.predictability === 'low' ? t('report.rhythm.scattered') : null,
  }
})
</script>

<template>
  <div class="report-grid">
    <ReportSection
      :label="t('report.rhythm.heatmapLabel')"
      :title="t('report.rhythm.heatmapTitle')"
      :text="t('report.rhythm.heatmapText')"
      wide
    >
      <ActivityHeatmap :points="days" />
    </ReportSection>

    <ReportSection :label="t('report.rhythm.dayPartsLabel')" :title="t('report.rhythm.dayPartsTitle')">
      <DayPartsChart :distribution="data.derived.activityDistribution" />
    </ReportSection>

    <ReportSection :label="t('report.rhythm.availabilityLabel')" :title="t('report.rhythm.availabilityTitle')">
      <div v-if="usually" class="usually">
        <p class="usually__main">{{ usually.main }}</p>
        <p v-if="usually.second" class="usually__more">{{ usually.second }}</p>
        <p v-if="usually.scattered" class="usually__more">{{ usually.scattered }}</p>
      </div>
      <p v-else class="t-small t-muted">{{ t('common.na') }}</p>
    </ReportSection>

    <ReportSection :label="t('report.rhythm.weekdaysLabel')" :title="t('report.rhythm.weekdaysTitle')">
      <WeekdayChart :weekday="report.activity.weekday" />
    </ReportSection>

    <ReportSection :label="t('report.rhythm.hoursLabel')" :title="t('report.rhythm.hoursTitle')">
      <HourlyChart :hourly="report.activity.hourly" />
    </ReportSection>
  </div>
</template>

<style scoped>
.usually {
  display: grid;
  gap: var(--space-2);
}

.usually__main {
  color: var(--text);
  font: var(--text-title);
}

.usually__more {
  color: var(--text-muted);
  font: var(--text-ui);
  font-weight: 400;
}
</style>

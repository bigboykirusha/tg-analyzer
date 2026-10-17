<script setup lang="ts">
import { fillDailyGaps, type ReportDto } from '@tg-analyzer/shared'
import type { Fact } from '../ReportFacts.vue'

const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber, formatDecimal } = useI18n()

const report = computed(() => props.data.report)
const days = computed(() => fillDailyGaps(report.value.activity.daily))

const availabilityFacts = computed<Fact[]>(() => {
  const profile = props.data.derived.availabilityProfile
  return [
    {
      key: 'hours',
      label: t('report.rhythm.activeHours'),
      value: `${formatNumber(profile.activeHours)} / 24`,
      sub: t('report.rhythm.activeHoursHint', { value: formatDecimal(profile.activeHoursPct) }),
    },
    {
      key: 'predictability',
      label: t('report.rhythm.predictability'),
      value:
        profile.concentrationIndex === null
          ? t('common.na')
          : t(`report.rhythm.predictabilityLevel.${profile.predictability}`),
      sub:
        profile.concentrationIndex === null
          ? null
          : t('report.rhythm.concentration', { value: formatDecimal(profile.concentrationIndex) }),
    },
    {
      key: 'peak',
      label: t('report.rhythm.peakWindow'),
      value: profile.peakWindow?.replace('-', '–') ?? t('common.na'),
      sub: profile.secondaryWindow
        ? t('report.rhythm.secondaryWindow', { value: profile.secondaryWindow.replace('-', '–') })
        : t('report.rhythm.noSecondaryWindow'),
    },
  ]
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
      <ReportFacts :facts="availabilityFacts" :columns="1" />
    </ReportSection>

    <ReportSection :label="t('report.rhythm.weekdaysLabel')" :title="t('report.rhythm.weekdaysTitle')">
      <WeekdayChart :weekday="report.activity.weekday" />
    </ReportSection>

    <ReportSection :label="t('report.rhythm.hoursLabel')" :title="t('report.rhythm.hoursTitle')">
      <HourlyChart :hourly="report.activity.hourly" />
    </ReportSection>
  </div>
</template>

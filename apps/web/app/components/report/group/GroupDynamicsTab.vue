<script setup lang="ts">
import { fillDailyGaps, type ReportDto } from '@tg-analyzer/shared'

const props = defineProps<{ data: ReportDto }>()
const { t } = useI18n()
const days = computed(() => fillDailyGaps(props.data.report.activity.daily))
</script>

<template>
  <div class="report-grid">
    <ReportSection wide :title="t('group.dailyTitle')">
      <DailyVolumeChart :days="days" />
    </ReportSection>
    <ReportSection wide :title="t('report.rhythm.heatmapTitle')" :text="t('report.rhythm.heatmapText')">
      <ActivityHeatmap :points="days" />
    </ReportSection>
    <ReportSection :title="t('group.monthlyTitle')">
      <MonthlyChart :months="data.report.activity.monthly" />
    </ReportSection>
    <ReportSection :title="t('report.rhythm.weekdaysTitle')">
      <WeekdayChart :weekday="data.report.activity.weekday" />
    </ReportSection>
    <ReportSection wide :title="t('group.hoursTitle')">
      <HourlyChart :hourly="data.report.activity.hourly" :received-label="t('group.others')" />
    </ReportSection>
  </div>
</template>

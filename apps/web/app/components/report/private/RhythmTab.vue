<script setup lang="ts">
import { fillDailyGaps, type ReportDto } from '@tg-analyzer/shared'

/**
 * When you talk, each fact once: the role and «Ваше время» (window, weekdays, parts of the day),
 * then every day of the period and every hour of the day.
 */
const props = defineProps<{ data: ReportDto }>()
const { t } = useI18n()

const report = computed(() => props.data.report)
const days = computed(() => fillDailyGaps(report.value.activity.daily))
</script>

<template>
  <ReportRole :data="data" />
  <ReportSection :title="t('report.rhythm.heatmapTitle')" :text="t('report.rhythm.heatmapText')" wide>
    <ActivityHeatmap :points="days" />
  </ReportSection>

  <!-- 24 pairs of bars need the full width. -->
  <ReportSection :title="t('report.rhythm.hoursTitle')" wide>
    <HourlyChart :hourly="report.activity.hourly" :received-label="data.summary.title" />
  </ReportSection>
</template>

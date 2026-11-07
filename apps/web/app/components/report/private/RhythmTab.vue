<script setup lang="ts">
import { fillDailyGaps, type ReportDto } from '@tg-analyzer/shared'

/**
 * «Время», each fact once: «Ваше время» (role, peak window, 24 hours, parts of the day), the
 * records, the round-number messages, then every day of the period. The volume over time is the
 * pulse at the top.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber } = useI18n()

const report = computed(() => props.data.report)
const days = computed(() => fillDailyGaps(report.value.activity.daily))
/** «Писали друг другу 340 из 372 дней». */
const activeDays = computed(() => {
  const total = days.value.length
  if (!total) return undefined
  return tc('report.rhythm.activeDays', total, {
    active: formatNumber(days.value.filter((day) => day.total > 0).length),
  })
})
</script>

<template>
  <ReportRole :data="data" />
  <ReportRecords :data="data" />
  <ReportMilestones :data="data" />
  <ReportSection :title="t('report.rhythm.heatmapTitle')" :answer="activeDays" wide>
    <ActivityHeatmap :points="days" />
  </ReportSection>
</template>

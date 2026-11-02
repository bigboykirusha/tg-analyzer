<script setup lang="ts">
import { fillDailyGaps, type ReportDto } from '@tg-analyzer/shared'
import type { Fact } from '../ReportFacts.vue'

const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber, formatDecimal, formatPercent } = useI18n()

const report = computed(() => props.data.report)
const sessions = computed(() => report.value.sessions)
const days = computed(() => fillDailyGaps(report.value.activity.daily))
const sessionFacts = computed<Fact[]>(() => [
  {
    key: 'perWeek',
    label: t('report.sessions.perWeek'),
    value: formatDecimal(sessions.value.sessionsPerActiveWeek),
    sub: t('report.sessions.perWeekHint'),
  },
  {
    key: 'size',
    label: t('report.sessions.averageSize'),
    value: formatNumber(sessions.value.averageSessionMessages),
    sub: t('report.sessions.averageSizeHint'),
  },
  {
    key: 'night',
    label: t('report.sessions.night'),
    value: formatPercent(sessions.value.nightSessionsPct),
    sub: t('report.sessions.nightHint'),
  },
])
</script>

<template>
  <ReportSection :title="t('report.timeline.title')" :text="t('report.timeline.text')" wide>
    <DailyVolumeChart :days="days" />
  </ReportSection>

  <ReportChronicle :data="data" />

  <ReportRecords :data="data" />

  <ReportSection :title="t('report.sessions.title')" :text="t('report.sessions.text')" wide>
    <ReportFacts :facts="sessionFacts" :columns="3" />
  </ReportSection>
</template>

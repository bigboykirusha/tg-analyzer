<script setup lang="ts">
import { fillDailyGaps, type ReportDto } from '@tg-analyzer/shared'

/**
 * The chat over time: the volume with the facts that describe it (where it starts, its busiest
 * month, the trend) right under the line, then the records. Long pauses live in the records.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, formatDay, formatMonth } = useI18n()

const report = computed(() => props.data.report)
const days = computed(() => fillDailyGaps(report.value.activity.daily))

const facts = computed(() => [
  ...(report.value.period.firstMessageAt
    ? [
        {
          key: 'first',
          label: t('report.timeline.firstMessage'),
          value: formatDay(report.value.period.firstMessageAt.slice(0, 10), { day: 'numeric', month: 'long' }),
        },
      ]
    : []),
  { key: 'month', label: t('report.timeline.mostActiveMonth'), value: formatMonth(report.value.facts.mostActiveMonth) },
  { key: 'trend', label: t('report.timeline.trend'), value: t(`report.trend.${report.value.facts.trend}`) },
])
</script>

<template>
  <ReportSection :title="t('report.timeline.title')" wide>
    <DailyVolumeChart :days="days" />
    <dl class="fact-line">
      <div v-for="item in facts" :key="item.key">
        <dt>{{ item.label }}</dt>
        <dd class="t-num">{{ item.value }}</dd>
      </div>
    </dl>
  </ReportSection>

  <ReportRecords :data="data" />
</template>

<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Info } from '../../lib/icons'

const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber, formatDecimal } = useI18n()

type Tab = 'overview' | 'rhythm' | 'words' | 'timeline'
const tab = ref<Tab>('overview')
const isPhone = useMediaQuery('(max-width: 640px)')
const tabs = computed(() => [
  { value: 'overview' as const, label: t('report.tabs.overview') },
  { value: 'rhythm' as const, label: t('report.tabs.rhythm') },
  { value: 'words' as const, label: t('report.tabs.words') },
  { value: 'timeline' as const, label: t('report.tabs.timeline') },
])

const totals = computed(() => props.data.report.totals)
const sentShare = computed(() => (totals.value.messages ? (totals.value.sent / totals.value.messages) * 100 : null))

const shareHint = computed(() => {
  const share = sentShare.value
  if (share === null) return null
  if (share >= 65) return t('report.kpi.youWriteMuchMore')
  if (share > 55) return t('report.kpi.youWriteMore')
  if (share <= 35) return t('report.kpi.theyWriteMuchMore')
  if (share < 45) return t('report.kpi.theyWriteMore')
  return t('report.kpi.even')
})

const peak = computed(() => {
  const hourly = props.data.report.activity.hourly
  const hour = hourly.reduce((best, value, index) => (value.total > (hourly[best]?.total ?? 0) ? index : best), 0)
  if (!hourly[hour]?.total) return null
  const weekday = props.data.report.activity.weekday
  const day = weekday.reduce((best, value, index) => (value.total > (weekday[best]?.total ?? 0) ? index : best), 0)
  return {
    hour: `${String(hour).padStart(2, '0')}:00`,
    range: `${String(hour).padStart(2, '0')}:00–${String((hour + 1) % 24).padStart(2, '0')}:00`,
    day: t('chart.weekdaysLong').split(',')[day] ?? '',
  }
})
</script>

<template>
  <div class="stack stack--lg">
    <ReportKpis>
      <UiMetricCard
        :label="t('report.kpi.messages')"
        :value="formatNumber(totals.messages)"
        :sub="
          t('report.kpi.sentReceived', { sent: formatNumber(totals.sent), received: formatNumber(totals.received) })
        "
      />
      <UiMetricCard
        :label="t('report.kpi.share')"
        :value="sentShare === null ? t('common.na') : `${formatDecimal(sentShare)}%`"
        :sub="shareHint"
      />
      <UiMetricCard
        :label="t('report.kpi.wordsPerMessage')"
        :value="totals.textMessages ? formatDecimal(totals.words / totals.textMessages) : t('common.na')"
        :sub="t('report.kpi.textOnly')"
      />
      <UiMetricCard
        :label="t('report.kpi.peakHour')"
        :value="peak?.hour ?? t('common.na')"
        :sub="peak ? t('report.kpi.peakHint', { range: peak.range, day: peak.day }) : null"
      />
    </ReportKpis>

    <div v-if="totals.messages < 20" class="banner" role="status">
      <Info aria-hidden="true" />
      <p class="banner__text">{{ t('report.lowData') }}</p>
    </div>

    <ReportChanges :data="data" />

    <!-- Phones read the whole report as one long page; wider screens switch tabs. -->
    <template v-if="isPhone">
      <OverviewTab :data="data" />
      <RhythmTab :data="data" />
      <WordsTab :data="data" />
      <TimelineTab :data="data" />
    </template>
    <template v-else>
      <UiSegmentedControl v-model="tab" class="no-print" :options="tabs" :aria-label="t('report.tabs.label')" />

      <OverviewTab v-if="tab === 'overview'" :data="data" />
      <RhythmTab v-else-if="tab === 'rhythm'" :data="data" />
      <WordsTab v-else-if="tab === 'words'" :data="data" />
      <TimelineTab v-else :data="data" />
    </template>
  </div>
</template>

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

/** The same window as «When you're usually around» in Activity, so the two never disagree. */
const usually = computed(() => {
  const span = props.data.derived.availabilityProfile.peakWindow
  if (!span) return null
  const weekday = props.data.report.activity.weekday
  const day = weekday.reduce((best, value, index) => (value.total > (weekday[best]?.total ?? 0) ? index : best), 0)
  // «20–23 h»: whole hours are what people say; minutes appear only when present.
  const [from = '', to = ''] = span.split('-').map((time) => time.replace(/:00$/, ''))
  return {
    window: t('report.kpi.hoursRange', { from, to }),
    day: weekday[day]?.total ? (t('chart.weekdaysLong').split(',')[day] ?? '') : '',
  }
})
</script>

<template>
  <div class="stack stack--lg">
    <ReportPulse :data="data" />

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
        :label="t('report.kpi.usually')"
        :value="usually?.window ?? t('common.na')"
        :sub="usually?.day ? t('report.kpi.usuallyHint', { day: usually.day }) : null"
      />
    </ReportKpis>

    <div v-if="totals.messages < 20" class="banner" role="status">
      <Info aria-hidden="true" />
      <p class="banner__text">{{ t('report.lowData') }}</p>
    </div>

    <ReportInsights :data="data" />

    <ReportChanges :data="data" />

    <!-- Phones read the whole report as one long page; wider screens switch tabs. -->
    <ReportNav v-model="tab" :options="tabs" :label="t('report.tabs.label')" :scroll="isPhone" />
    <template v-if="isPhone">
      <ReportPart id="overview" :title="tabs[0]!.label"><OverviewTab :data="data" /></ReportPart>
      <ReportPart id="rhythm" :title="tabs[1]!.label"><RhythmTab :data="data" /></ReportPart>
      <ReportPart id="words" :title="tabs[2]!.label"><WordsTab :data="data" /></ReportPart>
      <ReportPart id="timeline" :title="tabs[3]!.label"><TimelineTab :data="data" /></ReportPart>
    </template>
    <template v-else>
      <OverviewTab v-if="tab === 'overview'" :data="data" />
      <RhythmTab v-else-if="tab === 'rhythm'" :data="data" />
      <WordsTab v-else-if="tab === 'words'" :data="data" />
      <TimelineTab v-else :data="data" />
    </template>
  </div>
</template>

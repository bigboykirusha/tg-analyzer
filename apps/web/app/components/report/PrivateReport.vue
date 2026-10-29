<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Info } from '../../lib/icons'

const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber, formatDecimal, formatDuration, formatPercent } = useI18n()

type Tab = 'overview' | 'talk' | 'rhythm' | 'words' | 'timeline'
const tab = ref<Tab>('overview')
const tabs = computed(() => [
  { value: 'overview' as const, label: t('report.tabs.overview') },
  { value: 'talk' as const, label: t('report.tabs.talk') },
  { value: 'rhythm' as const, label: t('report.tabs.rhythm') },
  { value: 'words' as const, label: t('report.tabs.words') },
  { value: 'timeline' as const, label: t('report.tabs.timeline') },
])

const totals = computed(() => props.data.report.totals)
const sentShare = computed(() => (totals.value.messages ? (totals.value.sent / totals.value.messages) * 100 : null))

const responses = computed(() => props.data.report.responses)
const mineShare = computed(() => (sentShare.value === null ? null : Math.round(sentShare.value)))

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

/** One plain sentence on top: who writes more, who replies faster, when you talk. */
const lead = computed(() => {
  const parts: string[] = []
  const share = sentShare.value
  const name = props.data.summary.title
  if (share !== null)
    parts.push(
      share > 55
        ? t('report.lead.balanceYou')
        : share < 45
          ? t('report.lead.balanceThem', { name })
          : t('report.lead.balanceEven'),
    )
  const mine = responses.value.medianMineSec
  const theirs = responses.value.medianTheirsSec
  if (mine !== null && theirs !== null) {
    const ratio = Math.max(mine, theirs) / Math.max(Math.min(mine, theirs), 1)
    parts.push(
      ratio < 1.5
        ? t('report.lead.replyEven')
        : mine < theirs
          ? t('report.lead.replyYou')
          : t('report.lead.replyThem', { name }),
    )
  }
  if (usually.value) parts.push(t('report.lead.when', { window: usually.value.window }))
  if (!parts.length) return null
  const sentence = parts.join(', ')
  return `${sentence.charAt(0).toLocaleUpperCase()}${sentence.slice(1)}.`
})
</script>

<template>
  <div class="stack stack--lg">
    <p v-if="lead" class="report-lead">{{ lead }}</p>
    <!-- What is new since the last run comes first: it is why people come back. -->
    <ReportChanges :data="data" />
    <ReportHero
      :data="data"
      :label="t('report.kpi.messages')"
      :value="formatNumber(totals.messages)"
      :note="tc('story.activeDaysCount', data.report.facts.activeDays)"
    >
      <template #accent>
        <div class="tile__label">{{ t('report.kpi.whoWritesMore') }}</div>
        <div v-if="mineShare !== null" class="share">
          <div class="tile__figure share__figure">
            {{ mineShare }}<small>/{{ 100 - mineShare }}</small>
          </div>
          <div class="share__bar" aria-hidden="true">
            <i :style="{ flexGrow: mineShare }" />
            <i :style="{ flexGrow: 100 - mineShare }" />
          </div>
          <div class="share__names">
            <span>{{ t('report.you') }} {{ formatNumber(totals.sent) }}</span>
            <span>{{ data.summary.title }} {{ formatNumber(totals.received) }}</span>
          </div>
          <p v-if="shareHint" class="tile__note">{{ shareHint }}</p>
        </div>
        <div v-else class="tile__figure">{{ t('common.na') }}</div>
      </template>
      <UiMetricCard
        class="span-3"
        :label="t('report.kpi.replyMedian')"
        :value="formatDuration(responses.medianMineSec)"
        :sub="
          responses.medianTheirsSec === null
            ? null
            : t('report.kpi.replyTheirs', { name: data.summary.title, time: formatDuration(responses.medianTheirsSec) })
        "
      />
      <UiMetricCard
        class="span-3"
        :label="t('report.kpi.starts')"
        :value="formatPercent(responses.iWriteFirstPct)"
        :sub="t('report.kpi.startsHint')"
      />
      <UiMetricCard
        class="span-3"
        :label="t('report.kpi.wordsPerMessage')"
        :value="formatDecimal(data.report.vocabulary.wordsPerMessage.mine)"
        :sub="
          data.report.vocabulary.wordsPerMessage.theirs
            ? t('report.kpi.wordsTheirs', {
                name: data.summary.title,
                value: formatDecimal(data.report.vocabulary.wordsPerMessage.theirs),
              })
            : null
        "
      />
      <UiMetricCard
        class="span-3"
        :label="t('report.kpi.usually')"
        :value="usually?.window ?? t('common.na')"
        :sub="usually?.day ? t('report.kpi.usuallyHint', { day: usually.day }) : null"
      />
    </ReportHero>

    <div v-if="totals.messages < 20" class="banner" role="status">
      <Info aria-hidden="true" />
      <p class="banner__text">{{ t('report.lowData') }}</p>
    </div>

    <ReportInsights :data="data" />

    <ReportNav v-model="tab" :options="tabs" :label="t('report.tabs.label')" />
    <OverviewTab v-if="tab === 'overview'" :data="data" />
    <TalkTab v-else-if="tab === 'talk'" :data="data" />
    <RhythmTab v-else-if="tab === 'rhythm'" :data="data" />
    <WordsTab v-else-if="tab === 'words'" :data="data" />
    <TimelineTab v-else :data="data" />
  </div>
</template>

<style scoped>
/* The report in one sentence, before any number. */
.report-lead {
  max-width: 34ch;
  font: 500 clamp(20px, 2.4vw, 26px) / 1.3 var(--font-sans);
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.share {
  display: grid;
  gap: var(--space-3);
}

.share__figure {
  font-size: 60px;
}

.share__bar {
  display: flex;
  gap: 3px;
  height: 6px;
}

.share__bar i {
  flex-basis: 0;
  border-radius: var(--radius-full);
  background: var(--you);
}

.share__bar i + i {
  background: var(--them);
}

.share__names {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--text-muted);
  font: var(--text-small);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.share__names span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .share__figure {
    font-size: 48px;
  }
}
</style>

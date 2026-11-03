<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Info } from '../../lib/icons'

const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber } = useI18n()

/** Three parts of one long page: how the two of you talk, when, and with which words. */
type Part = 'together' | 'time' | 'words'
const part = ref<Part>('together')
const tabs = computed(() => [
  { value: 'together' as const, label: t('report.tabs.together') },
  { value: 'time' as const, label: t('report.tabs.time') },
  { value: 'words' as const, label: t('report.tabs.words') },
])

const totals = computed(() => props.data.report.totals)
const sentShare = computed(() => (totals.value.messages ? (totals.value.sent / totals.value.messages) * 100 : null))

const mineShare = computed(() => (sentShare.value === null ? null : Math.round(sentShare.value)))

/** «Это 158 сообщений в день»: the total said as a daily habit over the whole period. */
const perDay = computed(() => {
  const { firstMessageAt, lastMessageAt } = props.data.report.period
  if (!firstMessageAt || !lastMessageAt) return null
  const days = Math.max(1, Math.round((Date.parse(lastMessageAt) - Date.parse(firstMessageAt)) / 86_400_000) + 1)
  const value = totals.value.messages / days
  if (value >= 1) return tc('report.fmt.perDay', Math.round(value))
  return tc('report.fmt.everyDays', Math.max(2, Math.round(1 / value)))
})
</script>

<template>
  <div class="stack stack--lg">
    <p v-if="totals.messages < 20" class="note" role="status">
      <Info aria-hidden="true" />
      {{ t('report.lowData') }}
    </p>
    <!-- One big number with a plain sentence under it, then the split between the two of you. -->
    <section class="tile tile--ink hero">
      <div class="tile__label">
        <span>{{ t('report.kpi.messages') }}</span>
        <span class="t-num">{{ tc('story.activeDaysCount', data.report.facts.activeDays) }}</span>
      </div>
      <div class="hero__top">
        <div class="hero__count">
          <p class="hero__figure t-num">{{ formatNumber(totals.messages) }}</p>
          <p v-if="perDay" class="hero__sentence">{{ perDay }}</p>
        </div>
        <div v-if="mineShare !== null" class="hero__split">
          <i class="hero__bar" aria-hidden="true">
            <b :style="{ flexGrow: totals.sent }" />
            <b :style="{ flexGrow: totals.received }" />
          </i>
          <p class="hero__sides t-num">
            <span>{{ t('report.you') }} · {{ formatNumber(totals.sent) }} · {{ mineShare }}%</span>
            <span>{{ 100 - mineShare }}% · {{ formatNumber(totals.received) }} · {{ data.summary.title }}</span>
          </p>
        </div>
      </div>
      <ReportPulse :data="data" bare class="hero__pulse" />
      <ReportInsights :data="data" bare />
    </section>

    <ReportNav v-model="part" :options="tabs" :label="t('report.tabs.label')" />
    <!-- «Вы двое» reads top to bottom: one full-width card per row. -->
    <ReportPart id="together" :title="t('report.tabs.together')">
      <ReportDuel :data="data" />
      <TalkTab :data="data" />
    </ReportPart>
    <ReportPart id="time" :title="t('report.tabs.time')">
      <div class="report-grid report-grid--even">
        <TimelineTab :data="data" />
        <RhythmTab :data="data" />
      </div>
    </ReportPart>
    <ReportPart id="words" :title="t('report.tabs.words')">
      <WordsTab :data="data" />
    </ReportPart>
  </div>
</template>

<style scoped>
.hero {
  gap: var(--space-3);
}

.hero__figure {
  font: var(--text-figure-lg);
  letter-spacing: -0.04em;
}

.hero__top {
  display: grid;
  gap: var(--space-4);
}

@media (min-width: 901px) {
  .hero__top {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: end;
    gap: var(--space-8);
  }
}

.hero__count {
  display: grid;
  gap: var(--space-2);
}

.hero__sentence {
  font: var(--text-lede);
  font-weight: 500;
}

.hero__split {
  display: grid;
  gap: var(--space-2);
}

.hero__bar {
  display: flex;
  gap: 3px;
  height: var(--bar-height);
}

.hero__bar b {
  border-radius: var(--radius-full);
  background: var(--you);
}

.hero__bar b + b {
  background: var(--them);
}

.hero__sides {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-1) var(--space-3);
  font: var(--text-small);
}

.hero__pulse {
  margin-top: var(--space-2);
}
</style>

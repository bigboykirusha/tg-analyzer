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

const shareHint = computed(() => {
  const share = sentShare.value
  if (share === null) return null
  if (share >= 65) return t('report.kpi.youWriteMuchMore')
  if (share > 55) return t('report.kpi.youWriteMore')
  if (share <= 35) return t('report.kpi.theyWriteMuchMore')
  if (share < 45) return t('report.kpi.theyWriteMore')
  return t('report.kpi.even')
})
</script>

<template>
  <div class="stack stack--lg">
    <p v-if="totals.messages < 20" class="note" role="status">
      <Info aria-hidden="true" />
      {{ t('report.lowData') }}
    </p>
    <ReportHero
      :data="data"
      :label="t('report.kpi.messages')"
      :value="formatNumber(totals.messages)"
      :note="tc('story.activeDaysCount', data.report.facts.activeDays)"
    >
      <template #accent>
        <div class="tile__label">{{ t('report.kpi.whoWritesMore') }}</div>
        <template v-if="mineShare !== null">
          <p v-if="shareHint" class="share__verdict">{{ shareHint }}</p>
          <div class="tile__figure share__figure">
            <span>{{ mineShare }}</span
            ><small>/</small><span>{{ 100 - mineShare }}</span>
          </div>
          <dl class="share__sides">
            <div>
              <dt>{{ t('report.you') }}</dt>
              <dd class="t-num">{{ formatNumber(totals.sent) }}</dd>
            </div>
            <div>
              <dt>{{ data.summary.title }}</dt>
              <dd class="t-num">{{ formatNumber(totals.received) }}</dd>
            </div>
          </dl>
        </template>
        <div v-else class="tile__figure">{{ t('common.na') }}</div>
      </template>
    </ReportHero>

    <ReportInsights :data="data" />

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
/* Who writes more: the answer in words, the split as a figure, both counts. No bar. */
.share__verdict::first-letter {
  text-transform: uppercase;
}

.share__verdict {
  margin-top: calc(var(--space-1) * -1);
  font: var(--text-h3);
  letter-spacing: -0.02em;
}

.share__figure {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-top: auto;
  font: var(--text-figure-lg);
}

/* Wide screens: the figure is as big as the other tiles', so the pair stays low. */
@media (min-width: 901px) {
  .share__figure {
    font: var(--text-figure);
  }
}

.share__figure small {
  font-size: 0.6em;
}

.share__sides {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  margin: 0;
  padding-top: var(--space-3);
  border-top: 1px solid var(--on-lime-line);
}

.share__sides div {
  display: grid;
  min-width: 0;
}

.share__sides dt {
  overflow: hidden;
  color: var(--text-muted);
  font: var(--text-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.share__sides dd {
  margin: 0;
  font: var(--text-title);
}
</style>

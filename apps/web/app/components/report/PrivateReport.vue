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

/** The whole period in days, first message to last: the base of every «в день». */
const days = computed(() => {
  const { firstMessageAt, lastMessageAt } = props.data.report.period
  if (!firstMessageAt || !lastMessageAt) return null
  return Math.max(1, Math.round((Date.parse(lastMessageAt) - Date.parse(firstMessageAt)) / 86_400_000) + 1)
})

/** «Это 158 сообщений в день»: the total said as a daily habit over the whole period. */
const perDay = computed(() => {
  if (!days.value) return null
  const value = totals.value.messages / days.value
  if (value >= 1) return tc('report.fmt.perDay', Math.round(value))
  return tc('report.fmt.everyDays', Math.max(2, Math.round(1 / value)))
})
const sideDaily = (count: number) =>
  days.value ? t('report.fmt.sideDaily', { count: formatNumber(Math.round((count / days.value) * 10) / 10) }) : null

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
    <!-- Ink: the count, its pulse and the key facts. Lime: who writes more. -->
    <ReportHero :data="data" :label="t('report.kpi.messages')" :value="formatNumber(totals.messages)" :note="perDay">
      <template #accent>
        <div class="tile__label">{{ t('report.kpi.whoWritesMore') }}</div>
        <template v-if="mineShare !== null">
          <p v-if="shareHint" class="share__verdict">{{ shareHint }}</p>
          <div class="share__figure t-num">
            <span>{{ mineShare }}</span
            ><small>/</small><span>{{ 100 - mineShare }}</span>
          </div>
          <i class="share__bar" aria-hidden="true">
            <b :style="{ flexGrow: totals.sent }" />
            <b :style="{ flexGrow: totals.received }" />
          </i>
          <dl class="share__sides">
            <div>
              <dt>{{ t('report.you') }}</dt>
              <dd class="t-num">{{ formatNumber(totals.sent) }}</dd>
              <dd v-if="sideDaily(totals.sent)" class="share__daily t-num">{{ sideDaily(totals.sent) }}</dd>
            </div>
            <div>
              <dt>{{ data.summary.title }}</dt>
              <dd class="t-num">{{ formatNumber(totals.received) }}</dd>
              <dd v-if="sideDaily(totals.received)" class="share__daily t-num">{{ sideDaily(totals.received) }}</dd>
            </div>
          </dl>
        </template>
        <div v-else class="tile__figure">{{ t('common.na') }}</div>
      </template>
    </ReportHero>

    <ReportNav v-model="part" :options="tabs" :label="t('report.tabs.label')" />
    <!-- «Вы двое» is masonry: every card at its own height, no stretched blanks (see useMasonry). -->
    <ReportPart id="together" :title="t('report.tabs.together')" columns>
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
/* Who writes more: the answer in words, the split as a figure and a bar, both counts with their daily pace. */
.share__verdict::first-letter {
  text-transform: uppercase;
}

.share__verdict {
  font: var(--text-h3);
  letter-spacing: var(--tracking-h3);
}

.share__figure {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-top: auto;
  font: var(--text-figure-lg);
  letter-spacing: var(--tracking-figure);
}

.share__figure small {
  font-size: 0.6em;
  color: var(--on-lime-muted);
}

.share__bar {
  display: flex;
  gap: 3px;
  height: var(--bar-height);
}

.share__bar b {
  border-radius: var(--radius-full);
  background: var(--on-lime);
}

.share__bar b + b {
  background: var(--on-lime-line);
}

.share__sides {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  margin: 0;
}

.share__sides div {
  display: grid;
  min-width: 0;
}

.share__sides div + div {
  text-align: right;
}

.share__sides dt {
  overflow: hidden;
  color: var(--on-lime-muted);
  font: var(--text-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.share__sides dd {
  margin: 0;
  font: var(--text-title);
}

.share__sides .share__daily {
  color: var(--on-lime-muted);
  font: var(--text-caption);
}
</style>

<script setup lang="ts">
import { computeChapters, type ReportDto } from '@tg-analyzer/shared'
import { Info } from '../../lib/icons'

const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber } = useI18n()

/** Three parts of one long page: how the two of you talk, when, and with which words. */
type Part = 'together' | 'time' | 'words'
const part = ref<Part>('together')
const tabs = computed(() => [
  { value: 'together' as const, label: t('report.tabs.together') },
  { value: 'time' as const, label: t('report.tabs.time') },
  { value: 'words' as const, label: t('report.tabs.words') },
])

const totals = computed(() => props.data.report.totals)
/** Reports made before voice and rituals were counted: say so instead of leaving cards out silently. */
const outdated = computed(() => !props.data.report.voice || !props.data.report.rituals)
/** The history in chapters under the pulse; none for a short or even chat. */
const chapters = computed(() => computeChapters(props.data.report.activity.daily))
const sentShare = computed(() => (totals.value.messages ? (totals.value.sent / totals.value.messages) * 100 : null))
const mineShare = computed(() => (sentShare.value === null ? null : Math.round(sentShare.value)))

/** «Пишете на равных» at 45–55%, otherwise who writes more, with the name. */
const shareHint = computed(() => {
  const share = sentShare.value
  if (share === null) return null
  const name = props.data.summary.title
  if (share >= 65) return t('report.kpi.youWriteMuchMore')
  if (share > 55) return t('report.kpi.youWriteMore')
  if (share <= 35) return t('report.kpi.theyWriteMuchMore', { name })
  if (share < 45) return t('report.kpi.theyWriteMore', { name })
  return t('report.kpi.even')
})
</script>

<template>
  <div class="stack stack--lg">
    <p v-if="totals.messages < 20" class="note" role="status">
      <Info aria-hidden="true" />
      {{ t('report.lowData') }}
    </p>
    <!-- Ink: the count and its pulse. Lime: who writes more. -->
    <ReportHero
      :data="data"
      :label="t('report.kpi.messages')"
      :value="formatNumber(totals.messages)"
      :chapters="chapters"
    >
      <template #accent>
        <h2 class="share__title">{{ t('report.kpi.whoWritesMore') }}</h2>
        <template v-if="mineShare !== null">
          <p v-if="shareHint" class="share__verdict">{{ shareHint }}</p>
          <div class="share__figure t-num">
            <span>{{ mineShare }}</span
            ><span class="share__slash">/</span><span>{{ 100 - mineShare }}</span>
          </div>
          <ReportLine
            class="share__line"
            :mine="totals.sent"
            :theirs="totals.received"
            :left="formatNumber(totals.sent)"
            :right="formatNumber(totals.received)"
          />
        </template>
        <p v-else class="share__verdict">{{ t('common.na') }}</p>
      </template>
    </ReportHero>

    <ReportSince :data="data" />
    <ReportNav v-model="part" :options="tabs" :label="t('report.tabs.label')" />
    <!-- «Вы двое» is masonry: every card at its own height, no stretched blanks (see useMasonry). -->
    <ReportPart id="together" :title="t('report.tabs.together')" columns>
      <ReportDuel :data="data" />
      <p v-if="outdated" class="note" role="status">
        <Info aria-hidden="true" />
        {{ t('report.talk.outdated') }}
      </p>
    </ReportPart>
    <ReportPart id="time" :title="t('report.tabs.time')">
      <RhythmTab :data="data" />
    </ReportPart>
    <ReportPart id="words" :title="t('report.tabs.words')">
      <WordsTab :data="data" />
    </ReportPart>
  </div>
</template>

<style scoped>
/* Who writes more: the question, the answer, the split as a figure and both counts on one line. */
.share__title {
  font: var(--text-title);
}

.share__verdict {
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
}

.share__verdict::first-letter {
  text-transform: uppercase;
}

.share__figure {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font: var(--text-figure);
  letter-spacing: var(--tracking-figure);
}

.share__slash {
  color: var(--on-lime-muted);
}

.share__line {
  margin-top: auto;
}
</style>

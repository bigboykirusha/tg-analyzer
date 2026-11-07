<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Info } from '../../lib/icons'

/** `noWords`: a shared link without words — the «О чём» part goes away instead of standing empty. */
const props = defineProps<{ data: ReportDto; noWords?: boolean }>()
const { t, formatNumber } = useI18n()

/** Three parts of one long page: how the two of you talk, when, and with which words. */
type Part = 'together' | 'time' | 'words'
const part = ref<Part>('together')
const tabs = computed(() => [
  { value: 'together' as const, label: t('report.tabs.together') },
  { value: 'time' as const, label: t('report.tabs.time') },
  ...(props.noWords ? [] : [{ value: 'words' as const, label: t('report.tabs.words') }]),
])

const totals = computed(() => props.data.report.totals)
/** Reports made before voice and rituals were counted: say so instead of leaving cards out silently. */
const outdated = computed(() => !props.data.report.voice || !props.data.report.rituals)
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

    <ReportSince :data="data" />
    <ReportNav v-model="part" :options="tabs" :label="t('report.tabs.label')" />
    <!-- «Вы двое» is masonry: every card at its own height, no stretched blanks (see useMasonry). -->
    <ReportPart id="together" :title="t('report.tabs.together')" columns>
      <!-- Who writes more: the split as one figure, theirs in the person's colour. -->
      <ReportSection :title="t('report.kpi.whoWritesMore')" :answer="mineShare !== null ? shareHint : t('common.na')">
        <template v-if="mineShare !== null">
          <div class="share__figure t-num" aria-hidden="true">
            <span>{{ mineShare }}</span
            ><span class="share__slash">/</span><span class="share__theirs">{{ 100 - mineShare }}</span>
          </div>
          <ReportLine
            :mine="totals.sent"
            :theirs="totals.received"
            :left="formatNumber(totals.sent)"
            :right="formatNumber(totals.received)"
          />
        </template>
      </ReportSection>
      <ReportDuel :data="data" />
      <p v-if="outdated" class="note" role="status">
        <Info aria-hidden="true" />
        {{ t('report.talk.outdated') }}
      </p>
    </ReportPart>
    <ReportPart id="time" :title="t('report.tabs.time')">
      <RhythmTab :data="data" />
    </ReportPart>
    <ReportPart v-if="!noWords" id="words" :title="t('report.tabs.words')">
      <WordsTab :data="data" />
    </ReportPart>
  </div>
</template>

<style scoped>
/* «51 / 49»: yours in ink, theirs in the person's colour; the slash is only a divider. */
.share__figure {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font: var(--text-figure);
  letter-spacing: var(--tracking-figure);
}

.share__slash {
  color: var(--border-strong);
  font-weight: 400;
}

.share__theirs {
  color: var(--them-ink);
}
</style>

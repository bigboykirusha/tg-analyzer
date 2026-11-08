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

/** «Пишете на равных» at 45–55%, otherwise who writes more, with the name (the same words as «Главное»). */
const verdict = useShareVerdict(() => props.data)
const shareHint = computed(() => verdict.value?.replace(/^./u, (letter) => letter.toLocaleUpperCase()) ?? null)
const headlines = useChapterHeadlines(() => props.data, { noWords: () => Boolean(props.noWords) })
const answerOf = (id: string) => headlines.value.find((headline) => headline.id === id)?.text ?? null
</script>

<template>
  <div class="report-layout">
    <ReportToc :headlines="headlines" />
    <div class="stack stack--lg">
      <p v-if="totals.messages < 20" class="note" role="status">
        <Info aria-hidden="true" />
        {{ t('report.lowData') }}
      </p>

      <ReportSince :data="data" />
      <ReportNav v-model="part" :options="tabs" :label="t('report.tabs.label')" />
      <!-- «Вы двое» is masonry: every card at its own height, no stretched blanks (see useMasonry). -->
      <ReportPart id="together" :title="t('report.tabs.together')" :answer="answerOf('together')" columns>
        <!-- Who writes more: the split as one figure, theirs in the person's colour. -->
        <ReportSection :title="t('report.kpi.whoWritesMore')" :answer="mineShare !== null ? shareHint : t('common.na')">
          <template v-if="mineShare !== null">
            <ReportLine
              size="lg"
              :mine="totals.sent"
              :theirs="totals.received"
              :left-name="t('report.you')"
              :right-name="data.summary.title"
              :left="`${mineShare}%`"
              :right="`${100 - mineShare}%`"
            />
            <p class="share__counts t-num">
              {{ t('report.kpi.counts', { mine: formatNumber(totals.sent), theirs: formatNumber(totals.received) }) }}
            </p>
          </template>
        </ReportSection>
        <ReportDuel :data="data" />
        <p v-if="outdated" class="note" role="status">
          <Info aria-hidden="true" />
          {{ t('report.talk.outdated') }}
        </p>
      </ReportPart>
      <ReportPart id="time" :title="t('report.tabs.time')" :answer="answerOf('time')">
        <RhythmTab :data="data" />
      </ReportPart>
      <ReportPart v-if="!noWords" id="words" :title="t('report.tabs.words')" :answer="answerOf('words')">
        <WordsTab :data="data" />
      </ReportPart>
    </div>
  </div>
</template>

<style scoped>
.share__counts {
  color: var(--text-muted);
  font: var(--text-small);
  text-align: center;
}
</style>

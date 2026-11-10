<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Info } from '../../lib/icons'

/** `noWords`: a shared link without words — the «О чём» part goes away instead of standing empty. */
const props = defineProps<{ data: ReportDto; noWords?: boolean }>()
const { t, formatNumber } = useI18n()

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
  <div class="report-flow">
    <p v-if="totals.messages < 20" class="report-note" role="status">
      <Info aria-hidden="true" />
      {{ t('report.lowData') }}
    </p>
    <!-- «Вы двое»: the first finding stands without a card, the rest are masonry (useMasonry). -->
    <ReportPart id="together" :title="t('report.tabs.together')" :answer="answerOf('together')" columns>
      <ReportSection
        hero
        :title="t('report.kpi.whoWritesMore')"
        :answer="mineShare !== null ? shareHint : t('common.na')"
      >
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
          <p class="share__counts">
            {{ t('report.kpi.counts', { mine: formatNumber(totals.sent), theirs: formatNumber(totals.received) }) }}
          </p>
        </template>
      </ReportSection>
      <ReportDuel :data="data" />
      <p v-if="outdated" class="report-note" role="status">
        <Info aria-hidden="true" />
        {{ t('report.talk.outdated') }}
      </p>
    </ReportPart>
    <ReportPart id="time" :title="t('report.tabs.time')" :answer="answerOf('time')">
      <RhythmTab :data="data" />
    </ReportPart>
    <ReportPart v-if="!noWords" id="words" :title="t('report.tabs.words')" :answer="answerOf('words')" columns>
      <WordsTab :data="data" />
    </ReportPart>
  </div>
</template>

<style scoped>
.report-flow {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.share__counts {
  color: var(--text-muted);
  font: var(--text-small);
}

.report-note {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  color: var(--text-muted);
  font: var(--text-small);
  --icon-size: var(--icon-sm);
}
</style>

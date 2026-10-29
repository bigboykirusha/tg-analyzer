<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import type { Comparison } from '../ReportCompare.vue'

const props = defineProps<{ data: ReportDto }>()
const { t, formatDecimal, formatDuration, formatPercent } = useI18n()

/** Below this many replies on either side a speed comparison is noise. */
const MIN_REPLY_SAMPLES = 5
/** Differences smaller than this ratio read as «about the same». */
const EVEN_RATIO = 1.25

const report = computed(() => props.data.report)
const responses = computed(() => report.value.responses)

function startsRow(): Comparison | null {
  const mine = responses.value.iWriteFirstPct
  if (mine === null) return null
  const theirs = 100 - mine
  let verdict = t('report.compare.startsEven')
  if (mine - 50 > 10) verdict = t('report.compare.startsMine', { share: formatPercent(mine) })
  else if (50 - mine > 10)
    verdict = t('report.compare.startsTheirs', { share: formatPercent(theirs), name: props.data.summary.title })
  return {
    key: 'starts',
    label: t('report.compare.starts'),
    mine: formatPercent(mine),
    theirs: formatPercent(theirs),
    minePct: mine,
    verdict,
  }
}

function speedRow(): Comparison | null {
  const { medianMineSec: mine, medianTheirsSec: theirs, mineSamples, theirsSamples } = responses.value
  if (mine === null && theirs === null) return null
  const enough =
    mine !== null && theirs !== null && mineSamples >= MIN_REPLY_SAMPLES && theirsSamples >= MIN_REPLY_SAMPLES
  let verdict = t('report.compare.speedFew')
  if (enough) {
    const ratio = Math.max(mine, theirs) / Math.max(Math.min(mine, theirs), 1)
    if (ratio < EVEN_RATIO) verdict = t('report.compare.speedEven')
    else
      verdict = t(mine < theirs ? 'report.compare.speedMine' : 'report.compare.speedTheirs', {
        ratio: formatDecimal(ratio),
        name: props.data.summary.title,
      })
  }
  // Time is not a share, so this row has no bar.
  return {
    key: 'speed',
    label: t('report.compare.speed'),
    mine: formatDuration(mine),
    theirs: formatDuration(theirs),
    minePct: null,
    verdict,
  }
}

function lengthRow(): Comparison | null {
  const { mine, theirs } = report.value.vocabulary.wordsPerMessage
  if (!mine || !theirs) return null
  const ratio = Math.max(mine, theirs) / Math.min(mine, theirs)
  const verdict =
    ratio < EVEN_RATIO
      ? t('report.compare.lengthEven')
      : t(mine > theirs ? 'report.compare.lengthMine' : 'report.compare.lengthTheirs', {
          ratio: formatDecimal(ratio),
          name: props.data.summary.title,
        })
  return {
    key: 'length',
    label: t('report.compare.length'),
    mine: t('report.compare.words', { value: formatDecimal(mine) }),
    theirs: t('report.compare.words', { value: formatDecimal(theirs) }),
    minePct: Math.round((mine / (mine + theirs)) * 100),
    verdict,
  }
}

const comparisons = computed(() =>
  [startsRow(), speedRow(), lengthRow()].filter((row): row is Comparison => row !== null),
)
</script>

<template>
  <div class="report-grid">
    <ReportSection :title="t('report.compare.title')">
      <ReportCompare v-if="comparisons.length" :their-name="data.summary.title" :rows="comparisons" />
      <p v-else class="t-small t-muted">{{ t('report.compare.empty') }}</p>
      <p v-if="responses.responseRate !== null" class="t-small t-muted">
        {{ t('report.compare.replyRate', { rate: formatPercent(responses.responseRate) }) }}
      </p>
    </ReportSection>

    <ReportSection :title="t('report.composition.title')" :text="t('report.composition.text')" wide>
      <CompositionChart :composition="report.composition" />
    </ReportSection>
  </div>
</template>

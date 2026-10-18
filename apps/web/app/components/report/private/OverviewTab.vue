<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import type { Comparison } from '../ReportCompare.vue'

const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber, formatDecimal, formatDuration, formatPercent } = useI18n()

/** Below this many replies on either side a speed comparison is noise. */
const MIN_REPLY_SAMPLES = 5
/** Differences smaller than this ratio read as «about the same». */
const EVEN_RATIO = 1.25

const report = computed(() => props.data.report)
const responses = computed(() => report.value.responses)

const balanceVerdict = computed(() => {
  const { sent, received } = report.value.totals
  if (!sent || !received) return null
  const ratio = Math.max(sent, received) / Math.min(sent, received)
  if (ratio < 1.15) return t('report.balance.even')
  return t(sent > received ? 'report.balance.youMore' : 'report.balance.theyMore', { ratio: formatDecimal(ratio) })
})

function startsRow(): Comparison | null {
  const mine = responses.value.iWriteFirstPct
  if (mine === null) return null
  const theirs = 100 - mine
  let verdict = t('report.compare.startsEven')
  if (mine - 50 > 10) verdict = t('report.compare.startsMine', { share: formatPercent(mine) })
  else if (50 - mine > 10) verdict = t('report.compare.startsTheirs', { share: formatPercent(theirs) })
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
      : t(mine > theirs ? 'report.compare.lengthMine' : 'report.compare.lengthTheirs', { ratio: formatDecimal(ratio) })
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
    <ReportSection :title="t('report.balance.title')">
      <div class="balance">
        <BalanceDonut :sent="report.totals.sent" :received="report.totals.received" />
        <div class="balance__legend">
          <div class="balance__row">
            <span><i class="dot dot--sent" />{{ t('report.you') }}</span>
            <strong class="t-num">{{ formatNumber(report.totals.sent) }}</strong>
          </div>
          <div class="balance__row">
            <span><i class="dot dot--received" />{{ t('report.them') }}</span>
            <strong class="t-num">{{ formatNumber(report.totals.received) }}</strong>
          </div>
          <p v-if="balanceVerdict" class="t-small t-muted">{{ balanceVerdict }}</p>
        </div>
      </div>
    </ReportSection>

    <ReportSection :title="t('report.compare.title')">
      <ReportCompare v-if="comparisons.length" :rows="comparisons" />
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

<style scoped>
.balance {
  display: flex;
  flex: 1;
  align-items: center;
  gap: var(--space-6);
}

.balance__legend {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: var(--space-3);
}

.balance__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--border);
}

.balance__row span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot--sent {
  background: var(--accent);
}

.dot--received {
  background: var(--accent-2);
}

@media (max-width: 480px) {
  .balance {
    gap: var(--space-4);
  }
}
</style>

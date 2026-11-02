<script setup lang="ts">
import type { ReportDto, SideCountDto } from '@tg-analyzer/shared'

/**
 * «Кто есть кто»: every two-sided habit of the chat in one card, like match stats.
 * You on the left, the other side on the right; the side that does noticeably more is in bold.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, formatDecimal, formatDuration, formatNumber, formatPercent } = useI18n()

/** A side leads when it does at least this many times more. */
const LEAD_RATIO = 1.25
/** Fewer events than this on both sides together is noise. */
const MIN_SAMPLES = 5
/** The ratio is printed next to the label only when the lead is this large. */
const SHOW_RATIO = 1.5

type Lead = 'mine' | 'theirs' | null

interface DuelRow {
  key: string
  label: string
  mine: string
  theirs: string
  /** Your share of the bar, 0–100. */
  minePct: number
  lead: Lead
  ratio: string | null
}

/** `mine` and `theirs` are «more is the lead» amounts; `format` prints the raw values. */
function makeRow(
  key: string,
  label: string,
  mine: number,
  theirs: number,
  format: typeof formatNumber,
  raw: { mine: number; theirs: number } = { mine, theirs },
): DuelRow | null {
  const total = mine + theirs
  if (!(total > 0)) return null
  const high = Math.max(mine, theirs)
  const low = Math.min(mine, theirs)
  const ratio = low > 0 ? high / low : Infinity
  const lead: Lead = ratio >= LEAD_RATIO ? (mine > theirs ? 'mine' : 'theirs') : null
  return {
    key,
    label,
    mine: format(raw.mine),
    theirs: format(raw.theirs),
    minePct: Math.round((mine / total) * 100),
    lead,
    ratio: lead && Number.isFinite(ratio) && ratio >= SHOW_RATIO ? `×${formatDecimal(ratio)}` : null,
  }
}

const count = (side: SideCountDto | undefined, key: string, label: string, min = 1) =>
  side && side.mine + side.theirs >= min ? makeRow(key, label, side.mine, side.theirs, formatNumber) : null

const minutes = (side: SideCountDto | undefined, key: string, label: string) =>
  side ? makeRow(key, label, side.mine, side.theirs, (value) => (value ? formatDuration(value) : '0')) : null

const rows = computed(() => {
  const report = props.data.report
  const { responses } = report
  const items: (DuelRow | null)[] = []

  const starts = responses.iWriteFirstPct
  if (starts !== null)
    items.push(makeRow('starts', t('report.duel.starts'), starts, 100 - starts, (value) => formatPercent(value)))

  // Faster is the lead: the bar is the other side's time.
  const { medianMineSec: mineSec, medianTheirsSec: theirsSec } = responses
  if (mineSec !== null && theirsSec !== null && mineSec + theirsSec > 0)
    items.push(
      makeRow('speed', t('report.duel.speed'), theirsSec, mineSec, formatDuration, {
        mine: mineSec,
        theirs: theirsSec,
      }),
    )

  const words = report.vocabulary.wordsPerMessage
  if (words.mine && words.theirs)
    items.push(makeRow('length', t('report.duel.length'), words.mine, words.theirs, (value) => formatDecimal(value)))

  items.push(count(report.habits?.questionTurns, 'questions', t('report.duel.questions'), MIN_SAMPLES))
  items.push(count(report.reactions?.given, 'reactions', t('report.duel.reactions')))
  items.push(count(report.stickers?.count, 'stickers', t('report.duel.stickers')))
  items.push(minutes(report.voice?.voice.seconds, 'voice', t('report.duel.voice')))
  items.push(minutes(report.voice?.round.seconds, 'round', t('report.duel.round')))
  items.push(count(report.rituals?.morningFirst, 'morning', t('report.duel.morning'), MIN_SAMPLES))
  items.push(count(report.rituals?.nightLast, 'night', t('report.duel.night'), MIN_SAMPLES))

  return items.filter((row): row is DuelRow => row !== null)
})
</script>

<template>
  <ReportSection
    v-if="rows.length"
    wide
    :title="t('report.duel.title')"
    :text="t('report.duel.text', { name: data.summary.title })"
  >
    <ul class="duel">
      <li v-for="row in rows" :key="row.key" class="duel__row" :class="row.lead && `is-${row.lead}`">
        <span class="duel__value duel__value--mine t-num">{{ row.mine }}</span>
        <span class="duel__label">
          {{ row.label }}
          <span v-if="row.ratio" class="duel__ratio t-num">{{ row.ratio }}</span>
        </span>
        <span class="duel__value duel__value--theirs t-num">{{ row.theirs }}</span>
        <span class="duel__bar" aria-hidden="true">
          <span class="duel__mine" :style="{ width: `${row.minePct}%` }" />
          <span class="duel__theirs" />
        </span>
      </li>
    </ul>
  </ReportSection>
</template>

<style scoped>
.duel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5) var(--space-8);
  list-style: none;
}

.duel__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: baseline;
  gap: var(--space-2) var(--space-3);
}

.duel__label {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-2);
  color: var(--text-muted);
  font: var(--text-small);
  text-align: center;
}

.duel__ratio {
  color: var(--text);
  font: var(--text-caption);
}

.duel__value {
  min-width: 0;
  color: var(--text-muted);
  font: var(--text-ui);
  overflow-wrap: anywhere;
}

.duel__value--theirs {
  text-align: right;
}

.is-mine .duel__value--mine,
.is-theirs .duel__value--theirs {
  color: var(--text);
  font-weight: 600;
}

.duel__bar {
  display: flex;
  grid-column: 1 / -1;
  gap: 2px;
  height: var(--bar-height);
  overflow: hidden;
  border-radius: var(--radius-full);
}

.duel__mine {
  flex: 0 0 auto;
  background: var(--you);
  transition: width var(--transition-slow);
}

.duel__theirs {
  flex: 1 1 auto;
  background: var(--them);
}

/* The side without the lead fades, so the eye counts points down the card. */
.is-mine .duel__theirs,
.is-theirs .duel__mine {
  opacity: 0.35;
}

@media (max-width: 640px) {
  .duel {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

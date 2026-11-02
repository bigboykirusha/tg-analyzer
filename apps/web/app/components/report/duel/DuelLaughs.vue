<script setup lang="ts">
import type { Versus } from '../../../composables/useVersus'

/**
 * A laugh meter: a dial with «поровну» at the top, the other side on the left and you on the
 * right. The needle leans by how many times one of you laughs more, up to five times.
 */
const props = defineProps<{ item: Versus; theirName: string }>()
const { t, formatDecimal } = useI18n()

const pair = computed(() => props.item.pairs[0]!)
const MAX_RATIO = 5
const CX = 120
const CY = 124
const R = 92

/** -1 (all the other side) … 0 (even) … 1 (all you), on a log scale of the ratio. */
const lean = computed(() => {
  const { mine, theirs } = pair.value
  if (!mine.value) return -1
  if (!theirs.value) return 1
  const value = Math.log(mine.value / theirs.value) / Math.log(MAX_RATIO)
  return Math.max(-1, Math.min(1, value))
})
const point = (value: number, radius: number) => {
  const angle = Math.PI / 2 - value * (Math.PI / 2)
  return { x: CX - radius * Math.cos(Math.PI - angle), y: CY - radius * Math.sin(angle) }
}
const needle = computed(() => point(lean.value, R - 20))
const arc = (from: number, to: number) => {
  const a = point(from, R)
  const b = point(to, R)
  return `M${a.x} ${a.y} A${R} ${R} 0 0 ${to > from ? 1 : 0} ${b.x} ${b.y}`
}
const fill = computed(() => (Math.abs(lean.value) < 0.01 ? '' : arc(0, lean.value)))

const figure = computed(() =>
  props.item.lead && Number.isFinite(props.item.ratio) ? `×${formatDecimal(props.item.ratio)}` : props.item.figure,
)
const verdict = computed(() => {
  if (!props.item.lead) return t('report.fmt.laughsEven')
  return props.item.lead === 'mine'
    ? t('report.fmt.laughsMine')
    : t('report.fmt.laughsTheirs', { name: props.theirName })
})
</script>

<template>
  <ReportSection tone="grey" :title="item.title" :text="t('report.fmt.laughsText')">
    <div class="laughs">
      <svg viewBox="0 0 240 150" class="meter" role="img" :aria-label="`${verdict} ${figure}`">
        <path :d="arc(-1, 1)" class="meter__track" />
        <path v-if="fill" :d="fill" class="meter__fill" :class="`meter__fill--${item.lead ?? 'mine'}`" />
        <line :x1="CX" :y1="CY" :x2="needle.x" :y2="needle.y" class="meter__needle" />
        <circle :cx="CX" :cy="CY" r="7" class="meter__hub" />
        <text :x="CX" y="12" text-anchor="middle" class="meter__tick">{{ t('report.duel.evenFigure') }}</text>
        <text x="4" y="148" class="meter__tick">{{ theirName }}</text>
        <text x="236" y="148" text-anchor="end" class="meter__tick">{{ t('report.you') }}</text>
      </svg>
      <div class="result">
        <p class="result__figure t-num">{{ figure }}</p>
        <p class="result__verdict">{{ verdict }}</p>
        <p class="result__counts t-num">
          {{ t('report.you') }} · {{ pair.mine.text }} &nbsp; {{ theirName }} · {{ pair.theirs.text }}
        </p>
      </div>
    </div>
  </ReportSection>
</template>

<style scoped>
/* The dial and the answer stack in a half-width card and stand side by side in a full-width one. */
.laughs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  align-items: end;
  gap: var(--space-5);
  margin-top: auto;
}

.meter {
  width: 100%;
  max-width: 320px;
  margin-inline: auto;
  overflow: visible;
}

.meter__track,
.meter__fill {
  fill: none;
  stroke-width: 18;
}

.meter__track {
  stroke: var(--border);
}

.meter__fill--mine {
  stroke: var(--you);
}

.meter__fill--theirs {
  stroke: var(--them);
}

.meter__needle {
  stroke: var(--text);
  stroke-width: 4;
  stroke-linecap: round;
}

.meter__hub {
  fill: var(--text);
}

.meter__tick {
  fill: var(--text-muted);
  font: var(--text-caption);
}

.result {
  display: grid;
  gap: var(--space-1);
  margin-top: auto;
}

.result__figure {
  font: var(--text-figure);
  letter-spacing: -0.04em;
}

.result__verdict {
  font: var(--text-title);
}

.result__counts {
  color: var(--text-muted);
  font: var(--text-small);
}
</style>

<script setup lang="ts">
import type { Versus } from '../../../composables/useVersus'

/**
 * A laugh meter: a dial with «поровну» at the top, you on the left and the other side on the
 * right, the order of every comparison in the report. The needle leans by how many times one of you laughs more, up to five times.
 */
const props = defineProps<{ item: Versus; theirName: string }>()
const { t } = useI18n()

const pair = computed(() => props.item.pairs[0]!)
const MAX_RATIO = 5
const CX = 120
const CY = 124
const R = 92

/** -1 (all you) … 0 (even) … 1 (all the other side), on a log scale of the ratio. */
const lean = computed(() => {
  const { mine, theirs } = pair.value
  if (!theirs.value) return -1
  if (!mine.value) return 1
  const value = Math.log(theirs.value / mine.value) / Math.log(MAX_RATIO)
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

/** «Вы смеётесь в 3,3 раза чаще» or «Смеётесь примерно поровну». */
const answer = computed(() => {
  if (!props.item.lead) return t('report.fmt.laughsEven')
  const who =
    props.item.lead === 'mine' ? t('report.fmt.laughsMine') : t('report.fmt.laughsTheirs', { name: props.theirName })
  return Number.isFinite(props.item.ratio) ? `${who} — ${props.item.note}` : who
})
</script>

<template>
  <ReportSection
    tone="grey"
    :title="item.title"
    :text="t('report.fmt.laughsText')"
    :answer="answer"
    :sides="{ mine: pair.mine.text, theirs: pair.theirs.text, name: theirName }"
  >
    <svg viewBox="0 0 240 150" class="meter" role="img" :aria-label="answer">
      <path :d="arc(-1, 1)" class="meter__track" />
      <path v-if="fill" :d="fill" class="meter__fill" :class="`meter__fill--${item.lead ?? 'mine'}`" />
      <line :x1="CX" :y1="CY" :x2="needle.x" :y2="needle.y" class="meter__needle" />
      <circle :cx="CX" :cy="CY" r="7" class="meter__hub" />
      <text x="4" y="148" class="meter__tick">{{ t('report.you') }}</text>
      <text x="236" y="148" text-anchor="end" class="meter__tick">{{ theirName }}</text>
    </svg>
  </ReportSection>
</template>

<style scoped>
.meter {
  width: 100%;
  max-width: 280px;
  margin-top: auto;
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
</style>

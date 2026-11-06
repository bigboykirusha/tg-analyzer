<script setup lang="ts">
/**
 * The signature chart: one tick per day, your messages above the line and
 * theirs below. Heights use a square-root scale so a quiet day still shows
 * and a record day does not flatten everything else.
 */
const props = withDefaults(
  defineProps<{
    days: readonly { sent: number; received: number }[]
    /** Pixel height of the whole strip. */
    height?: number
    /** Draw ticks one after another on mount: once per session, then it simply appears. */
    animate?: boolean
    label?: string
    /** Wide bars (60% of each slot) instead of hairline ticks, for a few dozen weeks or months. */
    bars?: boolean
  }>(),
  { height: 96, animate: false, label: '', bars: false },
)

const peak = computed(() => Math.max(1, ...props.days.map((day) => Math.max(day.sent, day.received))))
const ticks = computed(() =>
  props.days.map((day, index) => ({
    x: index + 0.5,
    up: Math.sqrt(day.sent / peak.value) * 48,
    down: Math.sqrt(day.received / peak.value) * 48,
  })),
)
/**
 * Bars get 20 units a slot: Chromium rasterises an animated SVG at its viewBox size and scales it
 * up, so a viewBox a few dozen units wide turns the bars into blurred columns.
 */
const unit = computed(() => (props.bars ? 20 : 1))
/** Bars keep a slot for at least 24 of them: a three-week chat draws three bars, not three slabs. */
const MIN_BAR_SLOTS = 24
const slots = computed(() => Math.max(1, props.days.length, props.bars ? MIN_BAR_SLOTS : 1))
const width = computed(() => slots.value * unit.value)

// The drawing is a welcome, not a loading state: the second report of a visit shows at once.
const SESSION_KEY = 'tg-analyzer-seismograph-played'
function playedThisSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}
const play = ref(props.animate && import.meta.client && !playedThisSession())
onMounted(() => {
  if (!play.value) return
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    // Private mode: it plays again next time, which is harmless.
  }
})
</script>

<template>
  <svg
    class="seismograph"
    :class="{ 'seismograph--animate': play, 'seismograph--bars': bars }"
    :viewBox="`0 0 ${width} 100`"
    preserveAspectRatio="none"
    :style="{ height: `${height}px` }"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
    focusable="false"
  >
    <line x1="0" :x2="width" y1="50" y2="50" class="seismograph__axis" />
    <template v-if="bars">
      <g class="seismograph__you">
        <rect
          v-for="(tick, index) in ticks"
          v-show="tick.up > 0"
          :key="`u${index}`"
          :x="(tick.x - 0.3) * unit"
          :y="49 - tick.up"
          :width="0.6 * unit"
          :height="tick.up"
          :style="play ? { '--i': index, '--n': ticks.length } : undefined"
        />
      </g>
      <g class="seismograph__them">
        <rect
          v-for="(tick, index) in ticks"
          v-show="tick.down > 0"
          :key="`t${index}`"
          :x="(tick.x - 0.3) * unit"
          y="51"
          :width="0.6 * unit"
          :height="tick.down"
          :style="play ? { '--i': index, '--n': ticks.length } : undefined"
        />
      </g>
    </template>
    <template v-else>
      <g class="seismograph__you">
        <line
          v-for="(tick, index) in ticks"
          v-show="tick.up > 0"
          :key="`u${index}`"
          :x1="tick.x"
          :x2="tick.x"
          y1="49"
          :y2="49 - tick.up"
          :style="play ? { '--i': index, '--n': ticks.length } : undefined"
        />
      </g>
      <g class="seismograph__them">
        <line
          v-for="(tick, index) in ticks"
          v-show="tick.down > 0"
          :key="`t${index}`"
          :x1="tick.x"
          :x2="tick.x"
          y1="51"
          :y2="51 + tick.down"
          :style="play ? { '--i': index, '--n': ticks.length } : undefined"
        />
      </g>
    </template>
  </svg>
</template>

<style scoped>
.seismograph {
  display: block;
  width: 100%;
  overflow: visible;
}

.seismograph line {
  vector-effect: non-scaling-stroke;
  stroke-width: 2px;
  stroke-linecap: butt;
}

/* Bars are rects: a scaled stroke blurs at the edges. */
.seismograph__you rect {
  fill: var(--you);
}

.seismograph__them rect {
  fill: var(--them);
}

.seismograph__axis {
  stroke: var(--border-strong);
  stroke-width: 1px !important;
}

.seismograph__you line {
  stroke: var(--you);
}

.seismograph__them line {
  stroke: var(--them);
}

.seismograph--animate .seismograph__you > *,
.seismograph--animate .seismograph__them > * {
  animation: seismograph-in var(--duration-slow) var(--ease-standard) both;
  /* The sweep takes the same 0.7 s however many ticks there are. */
  animation-delay: calc(var(--i, 0) * 700ms / var(--n, 100));
  transform-box: fill-box;
}

.seismograph--animate .seismograph__you > * {
  transform-origin: bottom;
}

.seismograph--animate .seismograph__them > * {
  transform-origin: top;
}

@keyframes seismograph-in {
  from {
    transform: scaleY(0);
  }
}
</style>

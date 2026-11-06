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
  }>(),
  { height: 96, animate: false, label: '' },
)

/**
 * One density everywhere: a hairline every 3 px or more. The strip measures its own width and
 * merges neighbouring days when there are more of them than fit, so the report's top, a report
 * card and the landing draw the same texture whatever data they pass.
 */
const TICK_PX = 3
const root = ref<SVGSVGElement | null>(null)
const room = ref(0)
const merged = computed(() => {
  const max = room.value ? Math.max(1, Math.floor(room.value / TICK_PX)) : props.days.length
  const size = Math.ceil(props.days.length / max)
  if (size <= 1) return props.days
  const out: { sent: number; received: number }[] = []
  props.days.forEach((day, index) => {
    if (index % size === 0) out.push({ sent: 0, received: 0 })
    out[out.length - 1]!.sent += day.sent
    out[out.length - 1]!.received += day.received
  })
  return out
})
let observer: ResizeObserver | undefined
onMounted(() => {
  if (!root.value) return
  observer = new ResizeObserver(([entry]) => {
    room.value = Math.round(entry?.contentRect.width ?? 0)
  })
  observer.observe(root.value)
})
onBeforeUnmount(() => observer?.disconnect())

const peak = computed(() => Math.max(1, ...merged.value.map((day) => Math.max(day.sent, day.received))))
const ticks = computed(() =>
  merged.value.map((day, index) => ({
    x: (index + 0.5) * UNIT,
    up: Math.sqrt(day.sent / peak.value) * 48,
    down: Math.sqrt(day.received / peak.value) * 48,
  })),
)
/** Ten units a tick: Chromium rasterises an animated SVG at its viewBox size, so a narrow viewBox blurs. */
const UNIT = 10
const width = computed(() => Math.max(1, merged.value.length) * UNIT)

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
    ref="root"
    class="seismograph"
    :class="{ 'seismograph--animate': play }"
    :viewBox="`0 0 ${width} 100`"
    preserveAspectRatio="none"
    :style="{ height: `${height}px` }"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
    focusable="false"
  >
    <line x1="0" :x2="width" y1="50" y2="50" class="seismograph__axis" />
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

.seismograph--animate .seismograph__you line,
.seismograph--animate .seismograph__them line {
  animation: seismograph-in var(--duration-slow) var(--ease-standard) both;
  /* The sweep takes the same 0.7 s however many ticks there are. */
  animation-delay: calc(var(--i, 0) * 700ms / var(--n, 100));
  transform-box: fill-box;
}

.seismograph--animate .seismograph__you line {
  transform-origin: bottom;
}

.seismograph--animate .seismograph__them line {
  transform-origin: top;
}

@keyframes seismograph-in {
  from {
    transform: scaleY(0);
  }
}
</style>

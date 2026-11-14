<script setup lang="ts">
/**
 * The mirrored pulse — the product's signature: one pill per period, your messages above the line in
 * ink, theirs below in the person's deep tone. Heights use a square-root scale so a quiet week still
 * shows and a record week does not flatten the rest. The data is folded into `bars` columns, so a
 * card, the poster and a story draw the same texture whatever they pass.
 * `pitch`: the room one bar and its gap take, in px; the count then follows the pulse's own width (`bars` is only
 * the first guess), so a narrow tile and a wide one show the same fine texture as the poster, not the same number
 * of ever wider bars or ever wider gaps.
 * `grow`: the bars rise out of the middle line, left to right, when the pulse appears (and again whenever
 * `grow` turns on) — the product's one signature motion. The wave takes as long whatever the count. Still under
 * reduced motion.
 * `read` (0–1): an analysis still reading. The data is what has been read so far; it takes that share of the columns
 * at the right (the history is read from today back), the rest are dots of what is still to come. The bars ease
 * into their new heights as the reading goes on.
 */
const props = withDefaults(
  defineProps<{
    data: readonly { sent: number; received: number }[]
    /** Height of each half in px; 0 leaves it to the caller's `--pulse-half` (a story frame sizes in cqw). */
    height?: number
    bars?: number
    pitch?: number
    label?: string
    grow?: boolean
    read?: number
  }>(),
  { height: 32, bars: 40, pitch: 0, label: '', grow: false, read: undefined },
)

const root = ref<HTMLElement>()
const fitted = ref(0)
let observer: ResizeObserver | undefined
onMounted(() => {
  if (!props.pitch || !root.value || typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(([entry]) => {
    const width = entry?.contentRect.width ?? 0
    if (width) fitted.value = Math.max(12, Math.round(width / props.pitch))
  })
  observer.observe(root.value)
})
onBeforeUnmount(() => observer?.disconnect())
const count = computed(() => fitted.value || props.bars)

type Column = { sent: number; received: number }

/** Always `bars` columns: a long history is folded, a short one is stretched, so every pulse has one texture. */
function fold(source: readonly Column[], bars: number): Column[] {
  const out = Array.from({ length: bars }, () => ({ sent: 0, received: 0 }))
  if (!bars) return out
  if (source.length >= bars)
    source.forEach((item, index) => {
      const slot = out[Math.min(bars - 1, Math.floor((index * bars) / source.length))]!
      slot.sent += item.sent
      slot.received += item.received
    })
  else
    // A short history is drawn smoothly between its points, not as steps of equal bars.
    out.forEach((slot, index) => {
      const at = (index * (source.length - 1)) / Math.max(1, bars - 1)
      const low = source[Math.floor(at)]!
      const high = source[Math.ceil(at)]!
      const mix = at - Math.floor(at)
      slot.sent = low.sent + (high.sent - low.sent) * mix
      slot.received = low.received + (high.received - low.received) * mix
    })
  return out
}

const reading = computed(() => props.read !== undefined)
const columns = computed(() => {
  const source = props.data.length ? props.data : [{ sent: 0, received: 0 }]
  const bars = count.value
  const drawn = reading.value ? Math.min(bars, Math.max(props.read! > 0 ? 1 : 0, Math.round(bars * props.read!))) : bars
  const out = fold(source, drawn)
  const peak = Math.max(1, ...out.map((item) => Math.max(item.sent, item.received)))
  // At least a dot, so an empty week reads as a quiet one rather than a gap.
  const scale = (value: number) => `${Math.max(8, Math.round(Math.sqrt(value / peak) * 100))}%`
  const ahead = Array.from({ length: bars - drawn }, () => ({ up: '8%', down: '8%', ahead: true }))
  return [...ahead, ...out.map((item) => ({ up: scale(item.sent), down: scale(item.received), ahead: false }))]
})
</script>

<template>
  <div
    ref="root"
    class="pulse"
    :class="{ 'pulse--grow': grow, 'pulse--reading': reading }"
    :role="label ? (reading ? 'progressbar' : 'img') : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
    :aria-valuenow="label && reading ? Math.round(read! * 100) : undefined"
    :aria-valuemin="label && reading ? 0 : undefined"
    :aria-valuemax="label && reading ? 100 : undefined"
    :style="{ '--n': count, ...(height ? { '--pulse-half': `${height}px` } : {}) }"
  >
    <div class="pulse__half pulse__half--up">
      <i
        v-for="(column, index) in columns"
        :key="index"
        :class="{ 'is-ahead': column.ahead }"
        :style="{ height: column.up, '--i': index }"
      />
    </div>
    <div class="pulse__half pulse__half--down">
      <i
        v-for="(column, index) in columns"
        :key="index"
        :class="{ 'is-ahead': column.ahead }"
        :style="{ height: column.down, '--i': index }"
      />
    </div>
  </div>
</template>

<style scoped>
.pulse {
  display: flex;
  flex-direction: column;
  gap: var(--space-0-5);
  width: 100%;
}

.pulse__half {
  display: flex;
  gap: var(--space-0-5);
  height: var(--pulse-half);
}

.pulse__half--up {
  align-items: flex-end;
}

.pulse__half--down {
  align-items: flex-start;
}

.pulse i {
  flex: 1;
  min-width: 1px;
  border-radius: var(--radius-pill);
}

.pulse__half--up i {
  background: var(--pulse-you, var(--you));
}

.pulse__half--down i {
  background: var(--pulse-them, var(--them));
}

/* Still to read: dots in the faint ink of the place (a poster's, or the page's border). */
.pulse .pulse__half i.is-ahead {
  background: var(--pulse-ahead, var(--border));
}

/* Reading: each bar eases into its height as more weeks arrive and the pulse is folded again. */
.pulse--reading i {
  transition:
    height var(--duration-chart) var(--ease-standard),
    background-color var(--duration-chart) var(--ease-standard);
}

/* Each bar grows out of the line between the two voices; a wave runs left to right. */
.pulse--grow i {
  animation: pulse-grow var(--duration-sheet) var(--ease-standard) both;
  /* --pulse-delay holds the wave until its card has landed (the landing deck). The wave lasts as long as 32 bars at
     the bar stagger, however many bars there are. */
  animation-delay: calc(var(--pulse-delay, 0ms) + var(--i) * var(--stagger-bar) * 32 / var(--n));
}

.pulse--grow .pulse__half--up i {
  transform-origin: 50% 100%;
}

.pulse--grow .pulse__half--down i {
  transform-origin: 50% 0;
}

@keyframes pulse-grow {
  from {
    transform: scaleY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pulse--grow i {
    animation: none;
  }

  .pulse--reading i {
    transition-duration: var(--duration-none);
  }
}
</style>

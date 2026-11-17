<script setup lang="ts">
import type { DirectionalCountDto } from '@tg-analyzer/shared'

/**
 * The day as a dial of 24 hours, one bar per hour of the whole chat, growing outward from the middle. The usual
 * window (`peak`, `availabilityProfile.peakWindow`) is lit: its bars in ink and a thick arc along the rim from the
 * hour it begins to the hour it ends, both marked; a second window (`second`) is a step lighter; the rest are neutral.
 * A thin outer arc divides the day into night, morning, afternoon and evening. In the middle stands the share of all
 * messages the peak window holds. Without `peak` the busiest hour is lit and there is no arc.
 * The marks are HTML over the picture, so the type keeps its own size however the dial scales.
 */
const props = defineProps<{
  hourly: DirectionalCountDto[]
  peak?: readonly number[]
  second?: readonly number[]
  label?: string
}>()
const { t, formatNumber, formatPercent } = useI18n()

const totals = computed(() => Array.from({ length: 24 }, (_, hour) => props.hourly[hour]?.total ?? 0))
const sum = computed(() => totals.value.reduce((all, total) => all + total, 0))
const top = computed(() => Math.max(1, ...totals.value))
const peakHours = computed(() => {
  if (props.peak) return props.peak
  const busiest = totals.value.findIndex((total) => total === top.value)
  return top.value > 0 && busiest >= 0 ? [busiest] : []
})
const secondHours = computed(() => (props.second ?? []).filter((hour) => !peakHours.value.includes(hour)))

/** The dial is drawn in a 100 × 100 box: the middle at 50, the bars from 22 to 38, the arcs on the rim. */
const MIDDLE = 50
const HOLE = 22
const REACH = 15
const RIM = 42
const MARK = 47

/** The point at `radius` for an hour on the dial (0 at the top, clockwise). */
function point(radius: number, hour: number) {
  const angle = (hour / 24) * 2 * Math.PI - Math.PI / 2
  return { x: MIDDLE + Math.cos(angle) * radius, y: MIDDLE + Math.sin(angle) * radius }
}

const bars = computed(() =>
  totals.value.map((total, hour) => {
    const from = point(HOLE, hour + 0.5)
    const to = point(HOLE + (total ? Math.max(2, (total / top.value) * REACH) : 0.6), hour + 0.5)
    const tone = peakHours.value.includes(hour) ? 'peak' : secondHours.value.includes(hour) ? 'second' : 'rest'
    return { hour, from, to, tone, empty: total === 0 }
  }),
)

/** An arc along the rim between two hours, a hair of gap at each end. */
function arc(start: number, end: number) {
  const a = point(RIM, start + 0.12)
  const b = point(RIM, end - 0.12)
  return `M${a.x.toFixed(2)},${a.y.toFixed(2)} A${RIM},${RIM} 0 ${end - start > 12 ? 1 : 0} 1 ${b.x.toFixed(2)},${b.y.toFixed(2)}`
}
const PARTS: [number, number][] = [
  [0, 5],
  [5, 12],
  [12, 19],
  [19, 24],
]
const peakArc = computed(() => {
  const hours = peakHours.value
  if (props.peak === undefined || !hours.length) return null
  const start = hours[0] ?? 0
  return arc(start, start + hours.length)
})

const pad = (hour: number) => String(hour % 24).padStart(2, '0')
/** The marks around the rim: 00, 06, 12, 18, and the two ends of the peak window in the text colour. */
const marks = computed(() => {
  const hours = peakHours.value
  const ends = props.peak !== undefined && hours.length ? [hours[0] ?? 0, ((hours[0] ?? 0) + hours.length) % 24] : []
  // A quarter mark within an hour of a window's end would sit on its label («12» next to «13»): the end speaks for it.
  const near = (a: number, b: number) => Math.min((a - b + 24) % 24, (b - a + 24) % 24) <= 1
  const out = [0, 6, 12, 18]
    .filter((hour) => !ends.some((end) => near(hour, end)))
    .map((hour) => ({ hour, strong: false }))
  for (const hour of ends) out.push({ hour, strong: true })
  return out.map((mark) => {
    const at = point(MARK, mark.hour)
    return { ...mark, text: pad(mark.hour), style: { left: `${at.x}%`, top: `${at.y}%` } }
  })
})

const share = computed(() => {
  if (props.peak === undefined || !peakHours.value.length || !sum.value) return null
  const inside = peakHours.value.reduce((all, hour) => all + (totals.value[hour] ?? 0), 0)
  return (inside / sum.value) * 100
})

const range = (hours: readonly number[]) =>
  hours.length ? `${pad(hours[0] ?? 0)}–${pad((hours[0] ?? 0) + hours.length)}` : ''

const summary = computed(() => {
  if (props.label) return props.label
  const total = (key: 'sent' | 'received') => props.hourly.reduce((all, hour) => all + (hour?.[key] ?? 0), 0)
  return t('chart.hourlySummary', { sent: formatNumber(total('sent')), received: formatNumber(total('received')) })
})
</script>

<template>
  <figure class="dial">
    <div class="dial__face" role="img" :aria-label="summary">
      <svg class="dial__svg" viewBox="0 0 100 100" aria-hidden="true">
        <path v-for="[from, to] in PARTS" :key="from" class="dial__part" :d="arc(from, to)" />
        <path v-if="peakArc" class="dial__peak" :d="peakArc" />
        <line
          v-for="bar in bars"
          :key="bar.hour"
          :class="['dial__bar', `dial__bar--${bar.tone}`, { 'dial__bar--empty': bar.empty }]"
          :x1="bar.from.x"
          :y1="bar.from.y"
          :x2="bar.to.x"
          :y2="bar.to.y"
        />
      </svg>
      <span
        v-for="mark in marks"
        :key="mark.hour"
        class="dial__mark t-label"
        :class="{ 'dial__mark--strong': mark.strong }"
        :style="mark.style"
        aria-hidden="true"
        >{{ mark.text }}</span
      >
      <p v-if="share !== null" class="dial__middle" aria-hidden="true">
        <b class="dial__share">{{ formatPercent(share) }}</b>
        <span class="t-label">{{ t('report.time.peakShare') }}</span>
      </p>
    </div>
    <ul v-if="peak !== undefined && peak.length" class="dial__key t-caption" aria-hidden="true">
      <li><i class="dial__swatch dial__swatch--peak" />{{ t('report.time.ringPeak') }} {{ range(peak) }}</li>
      <li v-if="secondHours.length">
        <i class="dial__swatch dial__swatch--second" />{{ t('report.time.ringSecond') }} {{ range(secondHours) }}
      </li>
      <li><i class="dial__swatch" />{{ t('report.time.ringRest') }}</li>
    </ul>
  </figure>
</template>

<style scoped>
.dial {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}

.dial__face {
  position: relative;
  width: min(100%, calc(var(--space-16) * 5));
  aspect-ratio: 1;
  margin: 0 auto;
  container-type: inline-size;
}

.dial__svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.dial__part {
  fill: none;
  stroke: var(--fill-control);
  stroke-linecap: round;
  stroke-width: 1.7;
}

.dial__peak {
  fill: none;
  stroke: var(--chart-neutral-strong);
  stroke-linecap: round;
  stroke-width: 2.4;
}

.dial__bar {
  stroke: var(--chart-neutral);
  stroke-linecap: round;
  stroke-width: 2.6;
}

.dial__bar--peak {
  stroke: var(--chart-neutral-strong);
}

.dial__bar--second {
  stroke: var(--heat-2);
}

.dial__bar--empty {
  opacity: 0.5;
  stroke-width: 1.2;
}

.dial__mark {
  position: absolute;
  color: var(--text-muted);
  transform: translate(-50%, -50%);
}

.dial__mark--strong {
  color: var(--text);
}

.dial__middle {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  max-width: 34%;
  margin: auto;
  color: var(--text-muted);
  text-align: center;
}

.dial__share {
  color: var(--text);
  font: var(--text-h1);
  letter-spacing: var(--tracking-h1);
}

@container (width <= 16rem) {
  .dial__middle {
    max-width: 40%;
  }

  .dial__share {
    font: var(--text-h2);
    letter-spacing: var(--tracking-h2);
  }

  .dial__middle .t-label {
    font: var(--text-caption);
  }
}

.dial__key {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-4);
  color: var(--text-muted);
}

.dial__key li {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
}

.dial__swatch {
  width: var(--space-4);
  height: var(--space-1);
  border-radius: var(--radius-pill);
  background: var(--chart-neutral);
}

.dial__swatch--peak {
  background: var(--chart-neutral-strong);
}

.dial__swatch--second {
  background: var(--heat-2);
}
</style>

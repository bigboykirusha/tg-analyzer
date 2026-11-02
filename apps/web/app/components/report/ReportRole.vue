<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Moon, Sun, Sunrise } from '../../lib/icons'

/**
 * When you are usually around, twice: a role badge on its own sky (Reddit Recap) and a wall
 * clock with the window painted on the dial. The window is `availabilityProfile.peakWindow`,
 * the same one as in the KPI and «Итоги».
 */
const props = defineProps<{ data: ReportDto }>()
const { t, formatPercent } = useI18n()

const window = computed(() => {
  const peak = props.data.derived.availabilityProfile.peakWindow
  if (!peak) return null
  const [from = '', to = ''] = peak.split('-')
  const start = Number.parseInt(from, 10)
  const end = Number.parseInt(to, 10)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  return { from, to, start, end }
})

type Role = 'night' | 'morning' | 'day' | 'evening'
const role = computed<Role | null>(() => {
  const value = window.value?.start
  if (value === undefined) return null
  if (value < 5) return 'night'
  if (value < 11) return 'morning'
  if (value < 17) return 'day'
  return 'evening'
})
const icon = computed(() => (role.value === 'night' ? Moon : role.value === 'morning' ? Sunrise : Sun))

const busiestDay = computed(() => {
  const weekday = props.data.report.activity.weekday
  const best = weekday.reduce((top, value, index) => (value.total > (weekday[top]?.total ?? 0) ? index : top), 0)
  return weekday[best]?.total ? (t('chart.weekdaysLong').split(',')[best] ?? '') : ''
})
const usually = computed(() => {
  if (!window.value) return ''
  const { from, to } = window.value
  return busiestDay.value
    ? t('report.rhythm.usuallyWithDay', { from, to, day: busiestDay.value })
    : t('report.rhythm.usually', { from, to })
})
const night = computed(() => props.data.report.sessions.nightSessionsPct)

/** Stars of the night sky: fixed spots, so the picture is the same on every visit. */
const STARS = Array.from({ length: 28 }, (_, index) => ({
  left: `${(index * 37) % 100}%`,
  top: `${(index * 53) % 60}%`,
}))

// The clock: twelve hours on the dial, the window as a sector.
const CX = 100
const R = 84
const at = (hour: number, radius: number) => {
  const angle = ((hour % 12) / 12) * 2 * Math.PI
  return { x: CX + radius * Math.sin(angle), y: CX - radius * Math.cos(angle) }
}
const sector = computed(() => {
  if (!window.value) return ''
  const span = (window.value.end - window.value.start + 24) % 24 || 24
  if (span >= 12) return ''
  const a = at(window.value.start, R)
  const b = at(window.value.start + span, R)
  return `M${CX} ${CX} L${a.x} ${a.y} A${R} ${R} 0 0 1 ${b.x} ${b.y} Z`
})
const ticks = Array.from({ length: 12 }, (_, hour) => ({
  hour,
  outer: at(hour, R - 4),
  inner: at(hour, hour % 3 ? R - 12 : R - 18),
}))
const hand = computed(() => (window.value ? at(window.value.start, R - 30) : at(0, R - 30)))
</script>

<template>
  <template v-if="window && role">
    <ReportSection tone="ink" class="role" :title="t('report.fmt.roleTitle')">
      <div v-if="role === 'night'" class="sky" aria-hidden="true">
        <i v-for="(star, index) in STARS" :key="index" :style="star" />
      </div>
      <component :is="icon" class="role__icon" aria-hidden="true" />
      <p class="role__name">{{ t(`report.fmt.role.${role}`) }}</p>
      <p class="role__text">{{ usually }}</p>
      <p v-if="night !== null && night > 0" class="role__note">
        {{ t('report.fmt.roleNight', { pct: formatPercent(night) }) }}
      </p>
    </ReportSection>

    <ReportSection :title="t('report.fmt.clockTitle')">
      <svg viewBox="0 0 200 200" class="clock" role="img" :aria-label="`${window.from}–${window.to}`">
        <circle :cx="CX" :cy="CX" :r="R" class="clock__face" />
        <path v-if="sector" :d="sector" class="clock__window" />
        <line
          v-for="tick in ticks"
          :key="tick.hour"
          :x1="tick.outer.x"
          :y1="tick.outer.y"
          :x2="tick.inner.x"
          :y2="tick.inner.y"
          class="clock__tick"
          :class="{ 'clock__tick--main': tick.hour % 3 === 0 }"
        />
        <line :x1="CX" :y1="CX" :x2="hand.x" :y2="hand.y" class="clock__hand" />
        <circle :cx="CX" :cy="CX" r="6" class="clock__hub" />
      </svg>
      <p class="clock__time t-num">{{ window.from }} — {{ window.to }}</p>
      <p v-if="busiestDay" class="clock__day">{{ t('report.fmt.clockDay', { day: busiestDay }) }}</p>
    </ReportSection>
  </template>
</template>

<style scoped>
.role {
  position: relative;
}

.sky {
  position: absolute;
  inset: 0 0 40%;
  pointer-events: none;
}

.sky i {
  position: absolute;
  width: 2px;
  height: 2px;
  border-radius: var(--radius-full);
  background: var(--text-muted);
}

.role__icon {
  width: 56px;
  height: 56px;
  margin-top: var(--space-4);
  color: var(--them);
}

.role__name {
  margin-top: auto;
  font: var(--text-figure);
  letter-spacing: -0.04em;
}

.role__text {
  font: var(--text-lede);
  font-weight: 500;
}

.role__note {
  color: var(--text-muted);
  font: var(--text-small);
}

.clock {
  width: 100%;
  max-width: 200px;
  margin-inline: auto;
}

.clock__face {
  fill: var(--surface-2);
}

.clock__window {
  fill: var(--them);
}

.clock__tick {
  stroke: var(--text);
  stroke-width: 1.5;
}

.clock__tick--main {
  stroke-width: 3;
}

.clock__hand {
  stroke: var(--text);
  stroke-width: 5;
  stroke-linecap: round;
}

.clock__hub {
  fill: var(--text);
}

.clock__time {
  font: var(--text-figure-sm);
  text-align: center;
}

.clock__day {
  color: var(--text-muted);
  font: var(--text-small);
  text-align: center;
}
</style>

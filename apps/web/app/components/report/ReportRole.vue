<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Moon, Sun, Sunrise } from '../../lib/icons'

/**
 * When you are around, each fact once. The role badge (Reddit Recap) names the part of the day
 * with the most messages and says its share. «Ваше время» holds the rest: the busiest window
 * on a wall clock (`availabilityProfile.peakWindow`, as in the KPI and «Итоги»), the weekdays and
 * the four parts of the day.
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
const PARTS = [
  ['night', 'night'],
  ['morning', 'morning'],
  ['afternoon', 'day'],
  ['evening', 'evening'],
] as const
/** The part of the day the peak window starts in, used only to break a tie. */
const windowRole = computed<Role | null>(() => {
  const value = window.value?.start
  if (value === undefined) return null
  if (value < 6) return 'night'
  if (value < 12) return 'morning'
  if (value < 18) return 'day'
  return 'evening'
})
/**
 * The role is the part of the day with the most messages, so «Ночные совы» never stands over a
 * chat that is mostly written by day. Parts within one point of the top are a tie; the peak
 * window decides it.
 */
const shares = computed(() => {
  const distribution = props.data.derived.activityDistribution
  const counts = PARTS.map(([key, name]) => ({ role: name as Role, count: distribution[key].total }))
  const total = counts.reduce((sum, item) => sum + item.count, 0)
  return total ? counts.map((item) => ({ ...item, share: (item.count / total) * 100 })) : []
})
const top = computed(() => {
  if (!shares.value.length) return null
  const best = Math.max(...shares.value.map((item) => item.share))
  const leaders = shares.value.filter((item) => best - item.share < 1)
  return leaders.find((item) => item.role === windowRole.value) ?? leaders[0] ?? null
})
const role = computed<Role | null>(() => top.value?.role ?? null)
const icon = computed(() => (role.value === 'night' ? Moon : role.value === 'morning' ? Sunrise : Sun))

const busiestDay = computed(() => {
  const weekday = props.data.report.activity.weekday
  const best = weekday.reduce((top, value, index) => (value.total > (weekday[top]?.total ?? 0) ? index : top), 0)
  return weekday[best]?.total ? (t('chart.weekdaysLong').split(',')[best] ?? '') : ''
})
const roleText = computed(() =>
  top.value && role.value
    ? t('report.fmt.roleShare', { pct: formatPercent(top.value.share), part: t(`report.fmt.rolePart.${role.value}`) })
    : '',
)
/** The seven days from Monday, the busiest one marked. */
const week = computed(() => {
  const weekday = props.data.report.activity.weekday
  const names = t('chart.weekdaysShort').split(',')
  const max = Math.max(1, ...weekday.map((day) => day.total))
  return [1, 2, 3, 4, 5, 6, 0].map((index) => ({
    index,
    name: names[index] ?? '',
    level: (weekday[index]?.total ?? 0) / max,
  }))
})
const second = computed(() => {
  const window = props.data.derived.availabilityProfile.secondaryWindow
  if (!window) return null
  const [from = '', to = ''] = window.split('-')
  return t('report.fmt.clockSecond', { from, to })
})

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
    <ReportSection tone="ink" class="role">
      <div v-if="role === 'night'" class="sky" aria-hidden="true">
        <i v-for="(star, index) in STARS" :key="index" :style="star" />
      </div>
      <component :is="icon" class="role__icon" aria-hidden="true" />
      <p class="role__name">{{ t(`report.fmt.role.${role}`) }}</p>
      <p class="role__text">{{ roleText }}</p>
    </ReportSection>

    <ReportSection :title="t('report.fmt.clockTitle')">
      <div class="clock__row">
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
        <div class="clock__copy">
          <p class="clock__time t-num">{{ window.from }} — {{ window.to }}</p>
          <p v-if="busiestDay" class="clock__day">{{ t('report.fmt.clockDay', { day: busiestDay }) }}</p>
          <p v-if="second" class="clock__day">{{ second }}</p>
        </div>
      </div>
      <ol class="week" :aria-label="t('report.rhythm.weekdaysTitle')">
        <li v-for="day in week" :key="day.index" class="week__day">
          <i
            class="week__bar"
            :class="{ 'week__bar--top': day.level === 1 }"
            :style="{ height: `${Math.round(6 + day.level * 46)}px` }"
          />
          <span>{{ day.name }}</span>
        </li>
      </ol>
      <DayPartsChart class="clock__parts" :distribution="data.derived.activityDistribution" />
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
  letter-spacing: var(--tracking-figure);
}

.role__text {
  font: var(--text-lede);
  font-weight: 500;
}

.clock__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-5);
}

.clock {
  flex: none;
  width: 132px;
}

.clock__copy {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}

.week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--space-2);
  height: 72px;
  margin-top: auto;
  list-style: none;
}

.week__day {
  display: grid;
  grid-template-rows: 1fr auto;
  justify-items: center;
  gap: var(--space-1);
  color: var(--text-muted);
  font: var(--text-caption);
}

.week__bar {
  align-self: end;
  width: 100%;
  border-radius: var(--radius-xs);
  background: var(--surface-2);
}

/* Whole-chat highlights use the heat scale (intensity), not --them (the other side). */
.week__bar--top {
  background: var(--heat-3);
}

.clock__face {
  fill: var(--surface-2);
}

.clock__window {
  fill: var(--heat-3);
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
}

.clock__day {
  color: var(--text-muted);
  font: var(--text-small);
}
.clock__parts {
  padding-top: var(--space-4);
  border-top: 1px solid var(--border);
}
</style>

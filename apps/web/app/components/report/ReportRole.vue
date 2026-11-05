<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * «Ваше время», one card, each fact once: the role (the part of the day with the most messages)
 * as the answer with the peak window under it (`availabilityProfile.peakWindow`, as in the KPI
 * and «Итоги»), then the weekdays as bars and the four parts of the day with their shares.
 */
const props = defineProps<{ data: ReportDto }>()
const { t } = useI18n()

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

const busiestDay = computed(() => {
  const weekday = props.data.report.activity.weekday
  const best = weekday.reduce((top, value, index) => (value.total > (weekday[top]?.total ?? 0) ? index : top), 0)
  return weekday[best]?.total ? (t('chart.weekdaysLong').split(',')[best] ?? '') : ''
})
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
</script>

<template>
  <ReportSection v-if="window && role" :title="t('report.fmt.clockTitle')" :answer="t(`report.fmt.role.${role}`)" wide>
    <p class="role__text">
      {{ t('report.fmt.rolePeak', { from: window.from, to: window.to }) }}
      <template v-if="busiestDay"> · {{ t('report.fmt.clockDay', { day: busiestDay }) }}</template>
      <template v-if="second"> · {{ second }}</template>
    </p>
    <ol class="week" :aria-label="t('report.rhythm.weekdaysTitle')">
      <li v-for="day in week" :key="day.index" class="week__day">
        <i
          class="week__bar"
          :class="{ 'week__bar--top': day.level === 1 }"
          :style="{ height: `${Math.max(4, Math.round(day.level * 48))}px` }"
        />
        <span>{{ day.name }}</span>
      </li>
    </ol>
    <DayPartsChart class="role__parts" :distribution="data.derived.activityDistribution" />
  </ReportSection>
</template>

<style scoped>
.role__text {
  color: var(--text-muted);
  font: var(--text-small);
  font-variant-numeric: tabular-nums;
  text-wrap: pretty;
}

/* Weekdays as real bars of the whole chat: grey, the busiest one in the strong step. */
.week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  align-items: end;
  gap: var(--space-2);
  height: 72px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.week__day {
  display: grid;
  justify-items: center;
  gap: var(--space-1);
  color: var(--text-muted);
  font: var(--text-caption);
}

.week__bar {
  width: 100%;
  max-width: 40px;
  border-radius: var(--radius-xs);
  background: var(--chart-neutral);
}

.week__bar--top {
  background: var(--chart-neutral-strong);
}

.role__parts {
  padding-top: var(--space-4);
  border-top: 1px solid var(--border);
}
</style>

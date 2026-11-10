<script setup lang="ts">
import type { DatedActivityDto } from '@tg-analyzer/shared'

/**
 * Every day of the last year as month calendars, Monday-first, the way a paper calendar reads.
 * Months wrap to the card's width, so nothing scrolls sideways; a phone shows the last six.
 */
const props = defineProps<{ points: DatedActivityDto[] }>()
const { t, tc, formatDay } = useI18n()

const MAX_MONTHS = 12
const PHONE_MONTHS = 6

interface Cell {
  date: string
  total: number
  level: number
}

const months = computed(() => {
  if (!props.points.length) return []
  const max = Math.max(...props.points.map((point) => point.total), 1)
  const byMonth = new Map<string, DatedActivityDto[]>()
  for (const point of props.points) {
    const key = point.date.slice(0, 7)
    byMonth.set(key, [...(byMonth.get(key) ?? []), point])
  }
  const keys = [...byMonth.keys()].slice(-MAX_MONTHS)
  return keys.map((key, index) => {
    const points = byMonth.get(key)!
    // Monday = 0 … Sunday = 6; the first cells of a month that starts mid-week stay empty.
    const offset = (new Date(`${points[0]!.date}T00:00:00Z`).getUTCDay() + 6) % 7
    const cells: Array<Cell | null> = [
      ...Array.from({ length: offset }, () => null),
      ...points.map((point) => ({
        date: point.date,
        total: point.total,
        level: point.total ? Math.max(1, Math.ceil((point.total / max) * 4)) : 0,
      })),
    ]
    return {
      key,
      // «Сентябрь»: the full name, as a paper calendar heads its page.
      name: formatDay(`${key}-01`, { month: 'long' }).replace(/^./u, (letter) => letter.toLocaleUpperCase()),
      year: key.slice(0, 4),
      cells,
      old: keys.length - index > PHONE_MONTHS,
    }
  })
})

/** A year next to the month name only where the year changes. */
const showYear = (index: number) => index === 0 || months.value[index]!.year !== months.value[index - 1]!.year

function describe(cell: Cell) {
  return `${formatDay(cell.date, { day: 'numeric', month: 'short', year: 'numeric' })}: ${tc('common.messagesCount', cell.total)}`
}
</script>

<template>
  <div v-if="months.length" class="calendar">
    <div class="calendar__months" role="img" :aria-label="t('report.rhythm.heatmapTitle')">
      <div v-for="(month, index) in months" :key="month.key" class="month" :class="{ 'month--old': month.old }">
        <span class="month__name">{{ showYear(index) ? `${month.name} ${month.year}` : month.name }}</span>
        <div class="month__days">
          <span
            v-for="(cell, cellIndex) in month.cells"
            :key="cell?.date ?? `pad-${cellIndex}`"
            class="calendar__cell"
            :class="cell ? `calendar__cell--${cell.level}` : 'calendar__cell--pad'"
            :title="cell ? describe(cell) : undefined"
          />
        </div>
      </div>
    </div>
  </div>
  <div v-else class="calendar-empty t-label">{{ t('chart.noActivity') }}</div>
</template>

<style scoped>
.calendar {
  display: grid;
  gap: var(--space-4);
}

.calendar__months {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  gap: var(--space-4) var(--space-6);
}

.month {
  display: grid;
  align-content: start;
  gap: var(--space-2);
}

.month__name {
  color: var(--text-muted);
  font: var(--text-caption);
}

.month__days {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--space-1);
}

.calendar__cell {
  display: block;
  aspect-ratio: 1;
  border-radius: var(--radius-mark);
}

.calendar__cell--pad {
  visibility: hidden;
}

.calendar__cell--0 {
  background: var(--surface-2);
}

.calendar__cell--1 {
  background: var(--heat-1);
}

.calendar__cell--2 {
  background: var(--heat-2);
}

.calendar__cell--3 {
  background: var(--heat-3);
}

.calendar__cell--4 {
  background: var(--heat-4);
}

.calendar-empty {
  padding: var(--space-8);
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  text-align: center;
}

/* A phone: three months a row, the last six. */
@media (max-width: 640px) {
  .calendar__months {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-4) var(--space-3);
  }

  .month--old {
    display: none;
  }
}
</style>

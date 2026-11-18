<script setup lang="ts">
import type { DatedActivityDto } from '@tg-analyzer/shared'

/**
 * Every day of the last year as month calendars, Monday-first, the way a paper calendar reads.
 * Months wrap to the card's width. Phones start with six and can reveal the older months.
 */
const props = defineProps<{ points: DatedActivityDto[] }>()
const { t, tc, formatDay } = useI18n()

const MAX_MONTHS = 12
const PHONE_MONTHS = 6
const showOlder = ref(false)
const monthsId = useId()

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
    <UiButton
      v-if="months.length > PHONE_MONTHS"
      class="calendar__toggle"
      variant="quiet"
      size="sm"
      :aria-expanded="showOlder"
      :aria-controls="monthsId"
      @click="showOlder = !showOlder"
    >
      {{ t(showOlder ? 'chart.calendar.collapse' : 'chart.calendar.expand') }}
    </UiButton>
    <div
      :id="monthsId"
      class="calendar__months"
      :class="{ 'calendar__months--expanded': showOlder }"
      role="img"
      :aria-label="t('report.rhythm.heatmapTitle')"
    >
      <div v-for="(month, index) in months" :key="month.key" class="month" :class="{ 'month--old': month.old }">
        <span class="month__name">
          {{ month.name }}<span v-if="showYear(index)">{{ '\u00a0' + month.year }}</span>
          <span v-else-if="index === months.length - PHONE_MONTHS" class="month__compact-year">{{
            '\u00a0' + month.year
          }}</span>
        </span>
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
    <p class="calendar__legend t-caption">
      {{ t('chart.calendar.quiet') }}
      <span class="calendar__scale" aria-hidden="true">
        <i v-for="level in 5" :key="level" class="calendar__cell" :class="`calendar__cell--${level - 1}`" />
      </span>
      {{ t('chart.calendar.busy') }}
    </p>
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
  grid-template-columns: repeat(auto-fit, minmax(104px, 1fr));
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

.month__compact-year,
.calendar__toggle {
  display: none;
}

.calendar__legend,
.calendar__scale {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.calendar__legend {
  color: var(--text-muted);
}

.calendar__scale {
  gap: var(--space-1);
}

.calendar__scale i {
  width: var(--space-3);
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
  border-radius: var(--radius-mark);
  color: var(--text-muted);
  text-align: center;
}

@media (max-width: 640px) {
  .calendar__months {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-4) var(--space-3);
  }

  .calendar__months:not(.calendar__months--expanded) .month--old {
    display: none;
  }

  .calendar__months:not(.calendar__months--expanded) .month__compact-year {
    display: inline;
  }

  .calendar__toggle {
    display: inline-flex;
    justify-self: start;
  }
}
</style>

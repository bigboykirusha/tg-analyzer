<script setup lang="ts">
import type { DatedActivityDto } from '@tg-analyzer/shared'

/** Calendar of daily activity, Monday-first, for the last year at most. */
const props = defineProps<{ points: DatedActivityDto[] }>()
const { t, tc, formatDay } = useI18n()

const MAX_WEEKS = 53
const LEVELS = [0, 1, 2, 3, 4] as const

interface Cell {
  date: string
  total: number
  level: number
}

const weeks = computed(() => {
  const points = props.points.slice(-MAX_WEEKS * 7)
  if (!points.length) return []

  const max = Math.max(...points.map((point) => point.total), 1)
  // Monday = 0 … Sunday = 6
  const offset = (new Date(`${points[0]!.date}T00:00:00Z`).getUTCDay() + 6) % 7
  const cells: Array<Cell | null> = Array.from({ length: offset }, () => null)
  for (const point of points) {
    cells.push({
      date: point.date,
      total: point.total,
      level: point.total ? Math.max(1, Math.ceil((point.total / max) * 4)) : 0,
    })
  }

  const result: Array<Array<Cell | null>> = []
  for (let index = 0; index < cells.length; index += 7) result.push(cells.slice(index, index + 7))
  return result
})

/** Month label above the first week that starts in a new month. */
const monthLabels = computed(() => {
  let previous = ''
  return weeks.value.map((week) => {
    const first = week.find((cell) => cell !== null)
    const month = first?.date.slice(0, 7) ?? ''
    if (!month || month === previous) return ''
    previous = month
    return formatDay(`${month}-01`, { month: 'short' })
  })
})

const cellSize = computed(() => {
  const count = weeks.value.length
  if (count <= 8) return 26
  if (count <= 20) return 18
  if (count <= 36) return 14
  return 12
})

const weekdayLabels = computed(() => {
  const names = t('chart.weekdaysShort').split(',')
  // Sun-first in copy; show Mon, Wed, Fri.
  return [names[1], '', names[3], '', names[5], '', '']
})

function describe(cell: Cell) {
  return `${formatDay(cell.date, { day: 'numeric', month: 'short', year: 'numeric' })}: ${tc('common.messagesCount', cell.total)}`
}
</script>

<template>
  <div v-if="weeks.length" class="heatmap" :style="{ '--cell': `${cellSize}px` }">
    <div class="heatmap__scroll">
      <div class="heatmap__body">
        <span />
        <div class="heatmap__months">
          <span v-for="(label, index) in monthLabels" :key="index" class="heatmap__month">{{ label }}</span>
        </div>
        <div class="heatmap__weekdays" aria-hidden="true">
          <span v-for="(label, index) in weekdayLabels" :key="index">{{ label }}</span>
        </div>
        <div class="heatmap__grid" role="img" :aria-label="t('report.rhythm.heatmapTitle')">
          <template v-for="(week, weekIndex) in weeks" :key="weekIndex">
            <span
              v-for="(cell, dayIndex) in week"
              :key="cell?.date ?? `pad-${weekIndex}-${dayIndex}`"
              class="heatmap__cell"
              :class="cell ? `heatmap__cell--${cell.level}` : 'heatmap__cell--pad'"
              :style="{ gridColumn: weekIndex + 1, gridRow: dayIndex + 1 }"
              :title="cell ? describe(cell) : undefined"
            />
          </template>
        </div>
      </div>
    </div>
    <div class="heatmap__legend t-small" aria-hidden="true">
      <span>{{ t('chart.less') }}</span>
      <span v-for="level in LEVELS" :key="level" class="heatmap__cell" :class="`heatmap__cell--${level}`" />
      <span>{{ t('chart.more') }}</span>
    </div>
  </div>
  <div v-else class="heatmap-empty t-small">{{ t('chart.noActivity') }}</div>
</template>

<style scoped>
.heatmap {
  --gap: 4px;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.heatmap__scroll {
  overflow-x: auto;
  scrollbar-width: none;
}

.heatmap__scroll::-webkit-scrollbar {
  display: none;
}

.heatmap__body {
  display: grid;
  grid-template-columns: auto auto;
  gap: var(--space-1) var(--space-2);
  width: max-content;
}

.heatmap__months {
  display: grid;
  grid-auto-columns: var(--cell);
  grid-auto-flow: column;
  gap: var(--gap);
  height: 16px;
}

.heatmap__month {
  overflow: visible;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 16px;
  white-space: nowrap;
}

.heatmap__weekdays {
  display: grid;
  grid-template-rows: repeat(7, var(--cell));
  gap: var(--gap);
  color: var(--text-muted);
  font-size: 11px;
}

.heatmap__weekdays span {
  display: flex;
  align-items: center;
}

.heatmap__grid {
  display: grid;
  grid-template-rows: repeat(7, var(--cell));
  grid-auto-columns: var(--cell);
  gap: var(--gap);
}

.heatmap__cell {
  display: block;
  width: var(--cell, 12px);
  height: var(--cell, 12px);
  border-radius: calc(var(--cell, 12px) / 4);
}

.heatmap__cell--pad {
  visibility: hidden;
}

.heatmap__cell--0 {
  background: var(--surface-2);
}

.heatmap__cell--1 {
  background: color-mix(in srgb, var(--accent) 25%, var(--surface-2));
}

.heatmap__cell--2 {
  background: color-mix(in srgb, var(--accent) 50%, var(--surface-2));
}

.heatmap__cell--3 {
  background: color-mix(in srgb, var(--accent) 75%, var(--surface-2));
}

.heatmap__cell--4 {
  background: var(--accent);
}

.heatmap__legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-1);
  color: var(--text-muted);
}

.heatmap__legend .heatmap__cell {
  --cell: 12px;
}

.heatmap__legend span:first-child {
  margin-right: var(--space-1);
}

.heatmap__legend span:last-child {
  margin-left: var(--space-1);
}

.heatmap-empty {
  padding: var(--space-8);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  text-align: center;
}
</style>

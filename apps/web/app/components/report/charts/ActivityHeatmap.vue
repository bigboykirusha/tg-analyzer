<script setup lang="ts">
import type { DatedActivityDto } from '@tg-analyzer/shared'
import { ChevronLeft, ChevronRight } from '../../../lib/icons'

/** Calendar of daily activity, Monday-first, for the last year at most. */
const props = defineProps<{ points: DatedActivityDto[] }>()
const { t, tc, formatDay, formatPeriod } = useI18n()

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
  // Labels are about three weeks wide: a month that starts right after another would overprint it.
  let lastLabelled = -3
  return weeks.value.map((week, index) => {
    const first = week.find((cell) => cell !== null)
    const month = first?.date.slice(0, 7) ?? ''
    if (!month || month === previous) return ''
    previous = month
    if (index - lastLabelled < 3) return ''
    lastLabelled = index
    return formatDay(`${month}-01`, { month: 'short' })
  })
})

/** Width of the scroll area, so a short history fills the card instead of leaving it half empty. */
const room = ref(0)
/** The grid gap in px: the same `--space-1` the cells are laid out with. */
const GAP_PX = 4
const MAX_CELL = 22

const cellSize = computed(() => {
  const count = weeks.value.length
  const base = count <= 8 ? 26 : count <= 20 ? 18 : count <= 36 ? 14 : 12
  if (!room.value) return base
  const fit = Math.floor((room.value - GAP_PX * (count - 1)) / count)
  return Math.min(Math.max(base, fit), Math.max(base, MAX_CELL))
})

const weekdayLabels = computed(() => {
  const names = t('chart.weekdaysShort').split(',')
  // Sun-first in copy; show Mon, Wed, Fri.
  return [names[1], '', names[3], '', names[5], '', '']
})

// A long history scrolls sideways; open at the newest weeks, which matter most.
const scroller = ref<HTMLElement | null>(null)
const cells = computed(() => weeks.value.flat().filter((cell) => cell !== null))
const selectedDate = ref<string | null>(null)
const selected = computed(() => cells.value.find((cell) => cell.date === selectedDate.value) ?? cells.value.at(-1))
const period = computed(() => formatPeriod(cells.value[0]?.date, cells.value.at(-1)?.date, true))
const earlier = ref(false)
const later = ref(false)
const selectionId = useId()
const keyboardId = useId()
let resizeObserver: ResizeObserver | undefined
let resizeFrame = 0

function updateScroll() {
  const element = scroller.value
  if (!element) return
  room.value = element.clientWidth
  earlier.value = element.scrollLeft > 1
  later.value = element.scrollLeft + element.clientWidth < element.scrollWidth - 1
}

// Cell size depends on the measured width. Apply it in the next frame so
// changing the grid height cannot re-enter Safari's resize notification cycle.
function scheduleResize() {
  cancelAnimationFrame(resizeFrame)
  resizeFrame = requestAnimationFrame(updateScroll)
}

function newest() {
  if (scroller.value) scroller.value.scrollLeft = scroller.value.scrollWidth
  updateScroll()
}

function moveWeeks(direction: -1 | 1) {
  const element = scroller.value
  if (!element) return
  const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  element.scrollBy({ left: direction * element.clientWidth * 0.8, behavior })
}

function selectAtPoint(event: MouseEvent) {
  const grid = event.currentTarget as HTMLElement
  const rect = grid.getBoundingClientRect()
  const gap = Number.parseFloat(getComputedStyle(grid).gap) || 0
  const step = cellSize.value + gap
  const column = Math.max(
    0,
    Math.min(weeks.value.length - 1, Math.round((event.clientX - rect.left - cellSize.value / 2) / step)),
  )
  const row = Math.max(0, Math.min(6, Math.round((event.clientY - rect.top - cellSize.value / 2) / step)))
  const cell = weeks.value[column]?.[row]
  if (cell) selectedDate.value = cell.date
}

function onKeydown(event: KeyboardEvent) {
  const steps: Record<string, number> = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 }
  const index = cells.value.findIndex((cell) => cell.date === selected.value?.date)
  let next: number
  if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = cells.value.length - 1
  else if (event.key in steps) next = index + steps[event.key]!
  else return
  event.preventDefault()
  const cell = cells.value[Math.max(0, Math.min(cells.value.length - 1, next))]
  if (!cell) return
  selectedDate.value = cell.date
  scroller.value
    ?.querySelector<HTMLElement>(`[data-date="${CSS.escape(cell.date)}"]`)
    ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
}

onMounted(() => {
  newest()
  resizeObserver = new ResizeObserver(scheduleResize)
  if (scroller.value) resizeObserver.observe(scroller.value)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(resizeFrame)
  resizeObserver?.disconnect()
})
watch(weeks, async () => {
  await nextTick()
  newest()
  resizeObserver?.disconnect()
  if (scroller.value) resizeObserver?.observe(scroller.value)
})

function describe(cell: Cell) {
  return `${formatDay(cell.date, { day: 'numeric', month: 'short', year: 'numeric' })}: ${tc('common.messagesCount', cell.total)}`
}
</script>

<template>
  <div v-if="weeks.length" class="heatmap" :style="{ '--cell': `${cellSize}px` }">
    <div class="heatmap__toolbar">
      <span class="t-small t-muted">{{ period }}</span>
      <div v-if="earlier || later" class="heatmap__controls">
        <UiIconButton
          :icon="ChevronLeft"
          :label="t('chart.earlierWeeks')"
          size="sm"
          :disabled="!earlier"
          @click="moveWeeks(-1)"
        />
        <UiIconButton
          :icon="ChevronRight"
          :label="t('chart.laterWeeks')"
          size="sm"
          :disabled="!later"
          @click="moveWeeks(1)"
        />
      </div>
    </div>
    <div
      ref="scroller"
      class="heatmap__scroll"
      role="region"
      tabindex="0"
      :aria-label="t('report.rhythm.heatmapTitle')"
      :aria-describedby="`${selectionId} ${keyboardId}`"
      @scroll="updateScroll"
      @keydown="onKeydown"
    >
      <div class="heatmap__body">
        <span />
        <div class="heatmap__months">
          <span v-for="(label, index) in monthLabels" :key="index" class="heatmap__month">{{ label }}</span>
        </div>
        <div class="heatmap__weekdays" aria-hidden="true">
          <span v-for="(label, index) in weekdayLabels" :key="index">{{ label }}</span>
        </div>
        <div class="heatmap__grid" role="img" :aria-label="t('report.rhythm.heatmapTitle')" @click="selectAtPoint">
          <template v-for="(week, weekIndex) in weeks" :key="weekIndex">
            <span
              v-for="(cell, dayIndex) in week"
              :key="cell?.date ?? `pad-${weekIndex}-${dayIndex}`"
              class="heatmap__cell"
              :class="[
                cell ? `heatmap__cell--${cell.level}` : 'heatmap__cell--pad',
                { 'is-selected': cell && cell.date === selected?.date },
              ]"
              :data-date="cell?.date"
              :style="{ gridColumn: weekIndex + 1, gridRow: dayIndex + 1 }"
              :title="cell ? describe(cell) : undefined"
            />
          </template>
        </div>
      </div>
    </div>
    <p v-if="selected" :id="selectionId" class="heatmap__selection t-small" role="status">{{ describe(selected) }}</p>
    <span :id="keyboardId" class="sr-only">{{ t('chart.calendarKeyboard') }}</span>
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
  --gap: var(--space-1);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.heatmap__scroll {
  overflow-x: auto;
  scrollbar-width: none;
}

.heatmap__toolbar,
.heatmap__controls {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.heatmap__toolbar {
  justify-content: space-between;
}

.heatmap__toolbar > span {
  min-width: 0;
}

.heatmap__controls {
  flex: none;
}

.heatmap__scroll:focus-visible {
  border-radius: var(--radius-xs);
  box-shadow: var(--focus-ring);
  outline: none;
}

.heatmap__selection {
  color: var(--text-muted);
  min-height: 2lh;
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
  font: var(--text-caption);
  white-space: nowrap;
}

.heatmap__weekdays {
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--surface);
  box-shadow: var(--space-2) 0 0 var(--surface);
  display: grid;
  grid-template-rows: repeat(7, var(--cell));
  gap: var(--gap);
  color: var(--text-muted);
  font: var(--text-caption);
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
  border-radius: var(--radius-xs);
}

.heatmap__cell--pad {
  visibility: hidden;
}

.heatmap__grid .heatmap__cell {
  cursor: pointer;
  scroll-margin-inline: calc(2ch + var(--space-2)) var(--space-1);
}

.heatmap__grid .heatmap__cell.is-selected {
  outline: 1px solid var(--text);
  outline-offset: 1px;
}

.heatmap__cell--0 {
  background: var(--surface-2);
}

.heatmap__cell--1 {
  background: var(--heat-1);
}

.heatmap__cell--2 {
  background: var(--heat-2);
}

.heatmap__cell--3 {
  background: var(--heat-3);
}

.heatmap__cell--4 {
  background: var(--text);
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
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  text-align: center;
}
</style>

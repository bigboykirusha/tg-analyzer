<script setup lang="ts">
/** Messages by weekday and hour: 168 cells, Monday first, in the chat's own time zone. */
const props = defineProps<{ cells: number[] }>()
const { t, tc } = useI18n()

const LEVELS = [0, 1, 2, 3, 4] as const
/** Reports store Sunday first; the grid starts the week on Monday. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

const max = computed(() => Math.max(...props.cells, 0))
const total = computed(() => props.cells.reduce((sum, value) => sum + value, 0))
const levelOf = (value: number) => (value ? Math.max(1, Math.ceil((value / max.value) * 4)) : 0)

interface Cell {
  row: number
  hour: number
  weekday: number
  total: number
  level: number
}

const rows = computed<Cell[][]>(() =>
  WEEK_ORDER.map((weekday, row) =>
    HOURS.map((hour) => {
      const value = props.cells[weekday * 24 + hour] ?? 0
      return { row, hour, weekday, total: value, level: levelOf(value) }
    }),
  ),
)
const flat = computed(() => rows.value.flat())
const peak = computed(() => flat.value.reduce((best, cell) => (cell.total > best.total ? cell : best), flat.value[0]!))

const selectedKey = ref<number | null>(null)
const selected = computed(() => flat.value[selectedKey.value ?? -1] ?? peak.value)
const selectionId = useId()
const keyboardId = useId()

const weekdayNames = computed(() => t('chart.weekdaysShort').split(','))
const clock = (hour: number) => `${String(hour).padStart(2, '0')}:00`
function describe(cell: Cell) {
  const name = weekdayNames.value[cell.weekday] ?? ''
  return `${name}, ${clock(cell.hour)}–${clock((cell.hour + 1) % 24)}: ${tc('common.messagesCount', cell.total)}`
}

function selectAtPoint(event: MouseEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const column = Math.min(23, Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * 24)))
  const row = Math.min(6, Math.max(0, Math.floor(((event.clientY - rect.top) / rect.height) * 7)))
  selectedKey.value = row * 24 + column
}

function onKeydown(event: KeyboardEvent) {
  const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -24, ArrowDown: 24 }
  const current = selectedKey.value ?? flat.value.indexOf(peak.value)
  let next: number
  if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = flat.value.length - 1
  else if (event.key in steps) next = current + steps[event.key]!
  else return
  event.preventDefault()
  selectedKey.value = Math.max(0, Math.min(flat.value.length - 1, next))
}
</script>

<template>
  <div v-if="total" class="week-hour">
    <div class="week-hour__body">
      <span />
      <div class="week-hour__hours" aria-hidden="true">
        <span v-for="hour in [0, 6, 12, 18]" :key="hour" :style="{ gridColumn: hour + 1 }">{{ hour }}</span>
      </div>
      <div class="week-hour__days" aria-hidden="true">
        <span v-for="weekday in WEEK_ORDER" :key="weekday">{{ weekdayNames[weekday] }}</span>
      </div>
      <div
        class="week-hour__grid"
        role="img"
        tabindex="0"
        :aria-label="t('report.rhythm.weekHourTitle')"
        :aria-describedby="`${selectionId} ${keyboardId}`"
        @click="selectAtPoint"
        @keydown="onKeydown"
      >
        <span
          v-for="cell in flat"
          :key="cell.row * 24 + cell.hour"
          class="week-hour__cell"
          :class="[`week-hour__cell--${cell.level}`, { 'is-selected': cell === selected }]"
          :title="describe(cell)"
        />
      </div>
    </div>
    <p :id="selectionId" class="t-small t-muted week-hour__selection" role="status">{{ describe(selected) }}</p>
    <span :id="keyboardId" class="sr-only">{{ t('chart.gridKeyboard') }}</span>
    <div class="week-hour__legend t-small" aria-hidden="true">
      <span>{{ t('chart.less') }}</span>
      <span v-for="level in LEVELS" :key="level" class="week-hour__cell" :class="`week-hour__cell--${level}`" />
      <span>{{ t('chart.more') }}</span>
    </div>
  </div>
  <div v-else class="week-hour-empty t-small">{{ t('chart.noActivity') }}</div>
</template>

<style scoped>
.week-hour {
  /* 24 columns need no more than this on a wide card: the cells stay cells, not tiles. */
  max-width: 44rem;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.week-hour__body {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-1) var(--space-2);
}

.week-hour__hours {
  display: grid;
  grid-template-columns: repeat(24, minmax(0, 1fr));
  gap: var(--space-1);
  color: var(--text-muted);
  font: var(--text-caption);
}

.week-hour__hours span {
  white-space: nowrap;
}

.week-hour__days {
  display: grid;
  grid-template-rows: repeat(7, 1fr);
  gap: var(--space-1);
  color: var(--text-muted);
  font: var(--text-caption);
}

.week-hour__days span {
  display: flex;
  align-items: center;
}

.week-hour__grid {
  display: grid;
  grid-template-columns: repeat(24, minmax(0, 1fr));
  gap: var(--space-1);
  cursor: pointer;
}

.week-hour__grid:focus-visible {
  border-radius: var(--radius-xs);
  box-shadow: var(--focus-ring);
  outline: none;
}

.week-hour__cell {
  display: block;
  aspect-ratio: 1;
  border-radius: var(--radius-xs);
}

.week-hour__grid .week-hour__cell.is-selected {
  outline: 1px solid var(--text);
  outline-offset: 1px;
}

.week-hour__cell--0 {
  background: var(--surface-2);
}

.week-hour__cell--1 {
  background: var(--heat-1);
}

.week-hour__cell--2 {
  background: var(--heat-2);
}

.week-hour__cell--3 {
  background: var(--heat-3);
}

.week-hour__cell--4 {
  background: var(--text);
}

.week-hour__selection {
  min-height: 1lh;
}

.week-hour__legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-1);
  color: var(--text-muted);
}

.week-hour__legend .week-hour__cell {
  width: 12px;
}

.week-hour__legend span:first-child {
  margin-right: var(--space-1);
}

.week-hour__legend span:last-child {
  margin-left: var(--space-1);
}

.week-hour-empty {
  padding: var(--space-8);
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  text-align: center;
}
</style>

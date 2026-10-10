<script setup lang="ts">
import type { DatedActivityDto } from '@tg-analyzer/shared'

const props = defineProps<{
  points: DatedActivityDto[]
}>()
const { t, formatDate, formatNumber } = useI18n()

const heatmapWeeks = computed(() => {
  const rows = props.points
  if (!rows.length) {
    return []
  }

  const first = rows[0]?.date
  const last = rows[rows.length - 1]?.date
  if (!first || !last) {
    return []
  }

  const byDate = new Map(rows.map((item) => [item.date, item.total]))
  const start = new Date(`${first}T00:00:00`)
  const end = new Date(`${last}T00:00:00`)
  const max = Math.max(...rows.map((item) => item.total), 1)
  const cells: Array<{ date: string | null; total: number; level: number }> = []

  for (let index = 0; index < start.getDay(); index += 1) {
    cells.push({ date: null, total: 0, level: 0 })
  }

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const date = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
    const total = byDate.get(date) ?? 0
    cells.push({
      date,
      total,
      level: total ? Math.max(1, Math.ceil((total / max) * 4)) : 0,
    })
  }

  const limited = cells.slice(-371)
  const weeks: (typeof limited)[] = []

  for (let index = 0; index < limited.length; index += 7) {
    weeks.push(limited.slice(index, index + 7))
  }

  return weeks.slice(-53)
})
const compactHeatmap = computed(() => heatmapWeeks.value.length <= 2)
const compactDays = computed(() => heatmapWeeks.value.flat().filter((day) => day.date !== null))

function levelClass(level: number) {
  if (level === 4) {
    return 'day-level-4'
  }
  if (level === 3) {
    return 'day-level-3'
  }
  if (level === 2) {
    return 'day-level-2'
  }
  if (level === 1) {
    return 'day-level-1'
  }
  return 'day-level-0'
}
</script>

<template>
  <div v-if="heatmapWeeks.length" class="heatmap-scroll">
    <div v-if="compactHeatmap" class="heatmap-grid heatmap-grid-compact">
      <div
        v-for="day in compactDays"
        :key="day.date ?? ''"
        class="heatmap-compact-day"
      >
        <div
          class="heatmap-day"
          :class="levelClass(day.level)"
          :title="
            day.date
              ? `${formatDate(day.date, { month: 'short', day: 'numeric', year: 'numeric' })}: ${formatNumber(day.total)} ${t('common.messages')}`
              : ''
          "
          :aria-label="
            day.date
              ? `${formatDate(day.date, { month: 'short', day: 'numeric' })}: ${formatNumber(day.total)} ${t('common.messages')}`
              : undefined
          "
        />
        <span class="heatmap-compact-label">{{
          day.date ? formatDate(day.date, { weekday: 'short', day: 'numeric' }) : ''
        }}</span>
      </div>
    </div>
    <div v-else class="heatmap-grid">
      <div v-for="(week, weekIndex) in heatmapWeeks" :key="`week-${weekIndex}`" class="heatmap-week">
        <div
          v-for="(day, dayIndex) in week"
          :key="day.date ?? `empty-${weekIndex}-${dayIndex}`"
          class="heatmap-day"
          :class="[levelClass(day.level), { 'heatmap-day-empty': !day.date }]"
          :title="
            day.date
              ? `${formatDate(day.date, { month: 'short', day: 'numeric', year: 'numeric' })}: ${formatNumber(day.total)} ${t('common.messages')}`
              : ''
          "
        />
      </div>
    </div>
  </div>
  <div v-else class="heatmap-empty t-small">{{ t('heatmap.empty') }}</div>
</template>

<style scoped>
.heatmap-scroll {
  overflow-x: auto;
  padding-bottom: var(--space-2);
  scrollbar-width: none;
}

.heatmap-scroll::-webkit-scrollbar {
  display: none;
}

.heatmap-grid {
  display: flex;
  gap: 4px;
  width: max-content;
}

.heatmap-grid-compact {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(42px, 1fr));
  gap: var(--space-2);
  width: 100%;
}

.heatmap-compact-day {
  display: grid;
  gap: 6px;
  min-width: 0;
  text-align: center;
}

.heatmap-compact-day .heatmap-day {
  width: auto;
  height: 10px;
  border-radius: 999px;
}

.heatmap-compact-label {
  overflow: hidden;
  color: var(--text-tertiary);
  font-size: 11px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.heatmap-week {
  display: grid;
  grid-template-rows: repeat(7, 1fr);
  gap: 4px;
}

.heatmap-day {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
}

.heatmap-day-empty {
  background: transparent;
  border-color: transparent;
}

.day-level-0 {
  background: var(--bg-overlay);
}

.day-level-1 {
  background: color-mix(in srgb, var(--accent) 28%, var(--bg-base));
}

.day-level-2 {
  background: color-mix(in srgb, var(--accent) 48%, var(--bg-base));
}

.day-level-3 {
  background: color-mix(in srgb, var(--accent) 72%, var(--bg-base));
}

.day-level-4 {
  background: var(--accent);
}

.heatmap-empty {
  padding: var(--space-8);
  border-radius: var(--radius-md);
  border: 1px dashed var(--border-default);
  color: var(--text-secondary);
  text-align: center;
}

@media (max-width: 768px) {
  .heatmap-day {
    width: 9px;
    height: 9px;
  }
}
</style>

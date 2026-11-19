<script setup lang="ts">
const props = defineProps<{ heatmap: number[] }>()
const { t, formatNumber } = useI18n()
const order = [1, 2, 3, 4, 5, 6, 0]
const hours = Array.from({ length: 24 }, (_, hour) => hour)

const days = computed(() => {
  const names = t('chart.weekdaysShort').split(',')
  const max = Math.max(1, ...props.heatmap)
  return order.map((day) => ({
    day,
    name: names[day],
    cells: hours.map((hour) => {
      const count = props.heatmap[day * hours.length + hour] ?? 0
      return {
        hour,
        level: Math.ceil((4 * count) / max),
        tooltip: `${names[day]}, ${String(hour).padStart(2, '0')}:00 — ${formatNumber(count)}`,
      }
    }),
  }))
})
</script>

<template>
  <figure class="week-hours" :aria-label="t('chart.weekHours.title')">
    <div class="week-hours__grid" aria-hidden="true">
      <span />
      <span v-for="hour in hours" :key="hour" class="week-hours__hour">{{
        hour % 6 === 0 ? String(hour).padStart(2, '0') : ''
      }}</span>
      <template v-for="day in days" :key="day.day">
        <span class="week-hours__day">{{ day.name }}</span>
        <span
          v-for="cell in day.cells"
          :key="cell.hour"
          class="week-hours__cell"
          :class="`week-hours__cell--${cell.level}`"
          :title="cell.tooltip"
        />
      </template>
    </div>
    <figcaption class="week-hours__legend t-caption">
      {{ t('chart.calendar.quiet') }}
      <span class="week-hours__scale" aria-hidden="true">
        <i v-for="level in 5" :key="level" class="week-hours__cell" :class="`week-hours__cell--${level - 1}`" />
      </span>
      {{ t('chart.calendar.busy') }}
    </figcaption>
  </figure>
</template>

<style scoped>
.week-hours {
  display: grid;
  gap: var(--space-3);
  margin-block: auto;
}

.week-hours__grid {
  display: grid;
  grid-template-columns: var(--space-5) repeat(24, minmax(0, 1fr));
  gap: var(--space-0-5);
  align-items: center;
  color: var(--text-muted);
}

.week-hours__hour,
.week-hours__day {
  font: var(--text-caption);
}

.week-hours__cell {
  display: block;
  aspect-ratio: 1;
  border-radius: var(--radius-mark);
  background: var(--surface-2);
}

.week-hours__cell--1 {
  background: var(--heat-1);
}
.week-hours__cell--2 {
  background: var(--heat-2);
}
.week-hours__cell--3 {
  background: var(--heat-3);
}
.week-hours__cell--4 {
  background: var(--heat-4);
}

.week-hours__legend,
.week-hours__scale {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-muted);
}

.week-hours__scale {
  gap: var(--space-0-5);
}

.week-hours__scale i {
  width: var(--space-2);
}
</style>

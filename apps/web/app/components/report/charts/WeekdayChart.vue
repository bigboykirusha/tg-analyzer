<script setup lang="ts">
import type { DirectionalCountDto } from '@tg-analyzer/shared'

/** Seven bars, Monday first: the whole chat in grey, the busiest day a step darker, the day under each. */
const props = defineProps<{ weekday: DirectionalCountDto[] }>()
const { t, formatNumber } = useI18n()

// Reports store Sunday first; charts start the week on Monday.
const order = [1, 2, 3, 4, 5, 6, 0]
const days = computed(() => {
  const names = t('chart.weekdaysShort').split(',')
  const values = order.map((day) => props.weekday[day]?.total ?? 0)
  const peak = Math.max(1, ...values)
  return order.map((day, index) => ({
    key: day,
    name: names[day] ?? '',
    height: (values[index]! / peak) * 100,
    peak: values[index] === peak && peak > 0,
  }))
})
const total = computed(() => props.weekday.reduce((sum, day) => sum + (day?.total ?? 0), 0))
</script>

<template>
  <ol class="week" role="img" :aria-label="t('chart.weekdaySummary', { messages: formatNumber(total) })">
    <li v-for="day in days" :key="day.key" class="week__day">
      <i
        class="week__bar"
        :class="{ 'week__bar--peak': day.peak }"
        :style="{ height: `${Math.max(day.height, 2)}%` }"
      />
      <span>{{ day.name }}</span>
    </li>
  </ol>
</template>

<style scoped>
.week {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: var(--space-2);
  width: 100%;
  max-width: calc(var(--space-16) * 7);
  height: calc(var(--chart-h) + var(--space-6));
  margin: 0;
  padding: 0;
  list-style: none;
}

.week__day {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  justify-items: stretch;
  gap: var(--space-2);
  min-width: 0;
  color: var(--text-muted);
  font: var(--text-caption);
  font-weight: 400;
  text-align: center;
}

.week__bar {
  display: block;
  align-self: end;
  border-radius: var(--radius-mark) var(--radius-mark) 0 0;
  background: var(--chart-neutral);
}

.week__bar--peak {
  background: var(--chart-neutral-strong);
}
</style>

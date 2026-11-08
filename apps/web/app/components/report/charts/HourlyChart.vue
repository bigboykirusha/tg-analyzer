<script setup lang="ts">
import type { DirectionalCountDto } from '@tg-analyzer/shared'

/**
 * 24 bars, one per hour of the whole chat, like «Ваше время» in a personal report: neutral, the
 * busiest hour in the group's colour, the hours marked every six under the axis.
 */
const props = defineProps<{ hourly: DirectionalCountDto[] }>()
const { t, formatNumber } = useI18n()

const hours = computed(() => {
  // `total`, as the answer above counts it («Самый оживлённый час»), so the lit bar is that hour.
  const totals = Array.from({ length: 24 }, (_, hour) => props.hourly[hour]?.total ?? 0)
  const peak = Math.max(1, ...totals)
  return totals.map((total, hour) => ({
    hour,
    height: (total / peak) * 100,
    peak: total === peak && total > 0,
    title: `${hour}:00 · ${formatNumber(total)}`,
  }))
})
const label = computed(() => {
  const sum = (key: 'sent' | 'received') => props.hourly.reduce((total, hour) => total + (hour?.[key] ?? 0), 0)
  return t('chart.hourlySummary', { sent: formatNumber(sum('sent')), received: formatNumber(sum('received')) })
})
</script>

<template>
  <figure class="hours">
    <div class="hours__bars" role="img" :aria-label="label">
      <i
        v-for="hour in hours"
        :key="hour.hour"
        :class="{ 'hours__bar--peak': hour.peak }"
        :style="{ height: `${Math.max(hour.height, 2)}%` }"
        :title="hour.title"
      />
    </div>
    <ol class="hours__axis t-num" aria-hidden="true">
      <li v-for="mark in [0, 6, 12, 18]" :key="mark">{{ mark }}:00</li>
    </ol>
  </figure>
</template>

<style scoped>
.hours {
  display: grid;
  gap: var(--space-2);
  margin: 0;
}

.hours__bars {
  display: grid;
  grid-template-columns: repeat(24, minmax(0, 1fr));
  align-items: end;
  gap: var(--space-0-5);
  height: calc(var(--chart-h-sm) - var(--space-20));
}

.hours__bars i {
  display: block;
  border-radius: var(--radius-mark) var(--radius-mark) 0 0;
  background: var(--chart-neutral);
}

.hours__bars .hours__bar--peak {
  background: var(--them);
}

/* Four marks, each under the first of its six hours. */
.hours__axis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  color: var(--text-muted);
  font: var(--text-caption);
  list-style: none;
}
</style>

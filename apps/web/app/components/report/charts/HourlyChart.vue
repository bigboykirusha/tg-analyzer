<script setup lang="ts">
import type { DirectionalCountDto } from '@tg-analyzer/shared'

/**
 * The day in 24 bars, one per hour of the whole chat: neutral, the peak hours in ink, the hours marked
 * under the axis (0:00, 6:00, 12:00, 18:00). `peak` lists the hours to light — the usual window
 * of a private chat; without it the busiest hour is lit.
 */
const props = defineProps<{ hourly: DirectionalCountDto[]; peak?: readonly number[]; label?: string }>()
const { t, formatNumber } = useI18n()

const hours = computed(() => {
  const totals = Array.from({ length: 24 }, (_, hour) => {
    const item = props.hourly[hour]
    return item?.total ?? 0
  })
  const top = Math.max(1, ...totals)
  return totals.map((total, hour) => ({
    hour,
    height: Math.max(3, (total / top) * 100),
    peak: props.peak ? props.peak.includes(hour) : total === top && total > 0,
  }))
})
const summary = computed(() => {
  if (props.label) return props.label
  const sum = (key: 'sent' | 'received') => props.hourly.reduce((total, hour) => total + (hour?.[key] ?? 0), 0)
  return t('chart.hourlySummary', { sent: formatNumber(sum('sent')), received: formatNumber(sum('received')) })
})
const MARKS = [0, 6, 12, 18]
</script>

<template>
  <figure class="hours">
    <div class="hours__bars" role="img" :aria-label="summary">
      <i
        v-for="hour in hours"
        :key="hour.hour"
        :class="{ 'is-peak': hour.peak }"
        :style="{ height: `${hour.height}%` }"
      />
    </div>
    <ol class="hours__axis" aria-hidden="true">
      <li v-for="mark in MARKS" :key="mark" :style="{ gridColumnStart: mark + 1 }">{{ mark }}:00</li>
    </ol>
  </figure>
</template>

<style scoped>
.hours {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 0;
}

.hours__bars {
  display: grid;
  grid-template-columns: repeat(24, minmax(0, 1fr));
  align-items: end;
  gap: var(--space-0-5);
  height: var(--chart-h);
}

.hours__bars i {
  border-radius: var(--radius-mark) var(--radius-mark) 0 0;
  background: var(--chart-neutral);
}

.hours__bars i.is-peak {
  background: var(--chart-neutral-strong);
}

/* Each mark under its own hour. */
.hours__axis {
  display: grid;
  grid-template-columns: repeat(24, minmax(0, 1fr));
  color: var(--text-muted);
  font: var(--text-label);
}

.hours__axis li {
  grid-row: 1;
  white-space: nowrap;
}
</style>

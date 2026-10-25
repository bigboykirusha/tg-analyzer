<script setup lang="ts">
import { fillDailyGaps, type ReportDto } from '@tg-analyzer/shared'

/**
 * The whole chat at a glance: the signature seismograph, one tick per day
 * (per week for chats longer than a year), yours up, theirs down.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, formatMonth } = useI18n()
const isPhone = useMediaQuery('(max-width: 640px)')

/** Ticks need about 3 px each to stay apart. */
const maxTicks = computed(() => (isPhone.value ? 110 : 360))

const days = computed(() => fillDailyGaps(props.data.report.activity.daily))
/** Days per tick: a day, a week or roughly a month, whichever fits. */
const bucket = computed(() => [1, 7, 30].find((size) => days.value.length / size <= maxTicks.value) ?? 30)
const ticks = computed(() => {
  if (bucket.value === 1) return days.value
  const buckets: { sent: number; received: number }[] = []
  days.value.forEach((day, index) => {
    if (index % bucket.value === 0) buckets.push({ sent: 0, received: 0 })
    const current = buckets[buckets.length - 1]!
    current.sent += day.sent
    current.received += day.received
  })
  return buckets
})
const title = computed(() =>
  bucket.value === 1
    ? t('report.pulse.title')
    : bucket.value === 7
      ? t('report.pulse.titleWeekly')
      : t('report.pulse.titleMonthly'),
)
const range = computed(() => {
  const first = days.value[0]?.date
  const last = days.value[days.value.length - 1]?.date
  return first && last ? { from: formatMonth(first.slice(0, 7)), to: formatMonth(last.slice(0, 7)) } : null
})
const partner = computed(() => props.data.summary.title)
</script>

<template>
  <figure v-if="ticks.length > 1" class="pulse">
    <figcaption class="pulse__caption">
      <span class="t-label">{{ title }}</span>
      <span class="pulse__legend">
        <span class="pulse__key pulse__key--you">{{ t('report.pulse.you') }}</span>
        <span class="pulse__key pulse__key--them">{{ partner }}</span>
      </span>
    </figcaption>
    <Seismograph
      :days="ticks"
      :height="isPhone ? 88 : 128"
      animate
      :label="t('report.pulse.label', { name: partner })"
    />
    <div v-if="range" class="pulse__axis t-small">
      <span>{{ range.from }}</span>
      <span>{{ range.to }}</span>
    </div>
  </figure>
</template>

<style scoped>
.pulse {
  display: grid;
  gap: var(--space-3);
}

.pulse__caption {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2) var(--space-4);
}

.pulse__legend {
  display: flex;
  gap: var(--space-4);
  min-width: 0;
  font: var(--text-small);
  font-weight: 600;
}

.pulse__key {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* The legend draws a tick the way the chart does: up for you, down for them. */
.pulse__key::before {
  content: '';
  flex: none;
  width: 3px;
  height: 12px;
  border-radius: 1px;
}

.pulse__key--you {
  color: var(--you-ink);
}

.pulse__key--you::before {
  background: var(--you);
  transform: translateY(-3px);
}

.pulse__key--them {
  color: var(--them-ink);
}

.pulse__key--them::before {
  background: var(--them);
  transform: translateY(3px);
}

.pulse__axis {
  display: flex;
  justify-content: space-between;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
</style>

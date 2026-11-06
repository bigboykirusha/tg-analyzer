<script setup lang="ts">
import { fillDailyGaps, type ReportDto } from '@tg-analyzer/shared'

/**
 * The whole chat at a glance: the signature seismograph, one tick per day
 * (per week for chats longer than a year), yours up, theirs down.
 */
/** `bare`: inside a tile that already names the chart, so only the legend stays. */
const props = defineProps<{ data: ReportDto; bare?: boolean }>()
const { t, formatMonth } = useI18n()
const isPhone = useMediaQuery('(max-width: 640px)')

/**
 * Hairline ticks need about 3 px each to stay apart. In the report's top tile (`bare`) the pulse
 * is a few dozen wide bars instead: a year of weekly hairlines reads as a barcode.
 */
const BARE_MAX = 40
const maxTicks = computed(() => (props.bare ? BARE_MAX : isPhone.value ? 110 : 360))

const days = computed(() => fillDailyGaps(props.data.report.activity.daily))
/** Days per tick: a day, a week or roughly a month, whichever fits. */
const bucket = computed(() => [1, 7, 14, 30].find((size) => days.value.length / size <= maxTicks.value) ?? 30)
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
/** In a group the lower ticks are everyone else together. */
const partner = computed(() => (props.data.report.group ? t('report.pulse.others') : props.data.summary.title))
</script>

<template>
  <figure v-if="ticks.length > 1" class="pulse">
    <figcaption class="pulse__caption">
      <span v-if="!bare" class="t-label">{{ title }}</span>
      <span class="pulse__legend">
        <span class="pulse__key pulse__key--you"
          ><span class="pulse__name">{{ t('report.pulse.you') }}</span></span
        >
        <span class="pulse__key pulse__key--them"
          ><span class="pulse__name">{{ partner }}</span></span
        >
      </span>
    </figcaption>
    <Seismograph
      :days="ticks"
      :height="bare ? 56 : isPhone ? 80 : 96"
      :bars="bare"
      animate
      :label="data.report.group ? t('report.pulse.labelGroup') : t('report.pulse.label', { name: partner })"
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
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-3);
  min-width: 0;
}

.pulse__caption {
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2) var(--space-4);
}

.pulse__legend {
  display: flex;
  flex: 0 1 auto;
  gap: var(--space-4);
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  font: var(--text-small);
  font-weight: 500;
}

.pulse__key {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

/* A long name ends in an ellipsis inside the tile instead of running past its edge. */
.pulse__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Dots, like every legend of the report. */
.pulse__key::before {
  content: '';
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
}

.pulse__key--you {
  color: var(--you-ink);
}

.pulse__key--you::before {
  background: var(--you);
}

.pulse__key--them {
  color: var(--them-ink);
}

.pulse__key--them::before {
  background: var(--them);
}

.pulse__axis {
  display: flex;
  justify-content: space-between;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
</style>

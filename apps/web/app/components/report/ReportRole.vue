<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { personaOf } from '../../lib/persona'

/**
 * «Время» opens with «Ваше время» on the room itself: the usual window as the answer
 * (`availabilityProfile.peakWindow`, as in «Итоги»), lit in ink on the 24 hours, and the four parts
 * of the day under them.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, formatPercent } = useI18n()

const window = computed(() => {
  const peak = props.data.derived.availabilityProfile.peakWindow
  if (!peak) return null
  const [from = '', to = ''] = peak.split('-')
  const start = Number.parseInt(from, 10)
  const end = Number.parseInt(to, 10)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  return { from, to, start, end }
})
/** Hours of the peak window, also when it runs over midnight. */
const inPeak = (hour: number) => {
  const peak = window.value
  if (!peak) return false
  const length = (peak.end - peak.start + 24) % 24 || 24
  return (hour - peak.start + 24) % 24 < length
}

const peakHours = computed(() => Array.from({ length: 24 }, (_, hour) => hour).filter(inPeak))

type Role = 'night' | 'morning' | 'day' | 'evening'
const PARTS = [
  { key: 'night', role: 'night', label: 'chat.bucketNight' },
  { key: 'morning', role: 'morning', label: 'chat.bucketMorning' },
  { key: 'afternoon', role: 'day', label: 'chat.bucketAfternoon' },
  { key: 'evening', role: 'evening', label: 'chat.bucketEvening' },
] as const
const parts = computed(() => {
  const distribution = props.data.derived.activityDistribution
  const counts = PARTS.map((part) => ({ ...part, count: distribution[part.key].total }))
  const total = counts.reduce((sum, item) => sum + item.count, 0)
  return total ? counts.map((item) => ({ ...item, share: (item.count / total) * 100 })) : []
})
/** The answer is the part of the day around the usual window — the same one «Итоги» name (lib/persona). */
const role = computed<Role | null>(() => personaOf(props.data.derived.availabilityProfile.peakWindow))

/** «Пик — с 11:00 до 14:00»: the usual window, the same one «Итоги» and the chapter's line use. */
const answer = computed(() =>
  window.value ? t('report.time.peak', { from: window.value.from, to: window.value.to }).replace(/–/gu, '⁠–⁠') : null,
)
</script>

<template>
  <ReportSection v-if="window && role" hero :title="t('report.fmt.clockTitle')" :answer="answer">
    <HourlyChart :hourly="data.report.activity.hourly" :peak="peakHours" />
    <!-- The four parts of the day: the share said once, here. -->
    <ol class="parts">
      <li v-for="part in parts" :key="part.key">
        <b>{{ formatPercent(part.share) }}</b>
        <span>{{ t(part.label) }}</span>
      </li>
    </ol>
  </ReportSection>
</template>

<style scoped>
.parts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-1);
  padding-top: var(--space-2);
  text-align: center;
}

.parts li {
  display: flex;
  flex-direction: column;
  min-width: 0;
  color: var(--text-muted);
  font: var(--text-caption);
  font-weight: 400;
}

.parts b {
  color: var(--text);
  font: var(--text-small-strong);
}
</style>

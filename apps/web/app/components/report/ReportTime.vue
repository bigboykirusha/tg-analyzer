<script setup lang="ts">
import { fillDailyGaps, shouldShowYear, type ReportDto } from '@tg-analyzer/shared'
import { nbsp } from '../../lib/nbsp'
import { parseWindow } from '../../lib/persona'

/**
 * «Время»: when you are in touch. The answer is the usual window (`availabilityProfile.peakWindow`, the
 * same one «Итоги» say), lit in ink on the 24 hours; under the bars one line of three facts — the
 * busiest day, the longest run of days, the days you were in touch. No calendar and no parts of the day:
 * the pulse on the poster already shows the rhythm in time.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatDay, formatNumber } = useI18n()

const report = computed(() => props.data.report)
const window = computed(() => parseWindow(props.data.derived.availabilityProfile.peakWindow))
const peakHours = computed(() => {
  const peak = window.value
  return peak ? Array.from({ length: peak.length }, (_, index) => (peak.start + index) % 24) : []
})
/** «Пик — с 11:00 до 14:00», the dash held to its numbers. */
const answer = computed(() =>
  window.value ? t('report.time.peak', { from: window.value.from, to: window.value.to }).replace(/–/gu, '⁠–⁠') : null,
)

const days = computed(() => fillDailyGaps(report.value.activity.daily))
const facts = computed(() => {
  const out: { key: string; label: string; value: string }[] = []
  const first = days.value[0]?.date
  const last = days.value.at(-1)?.date
  const busiest = report.value.facts.mostActiveDate
  if (busiest) {
    const year = shouldShowYear(first, last)
    out.push({
      key: 'day',
      label: t('report.time.busiestDay'),
      value: formatDay(
        busiest.date.slice(0, 10),
        year ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' },
      ).replace(/\s?г\.$/u, ''),
    })
  }
  // A run as long as the whole chat says «every day», which the next fact already does.
  const streak = report.value.facts.maxStreak.days
  const active = days.value.filter((day) => day.total > 0).length
  if (streak > 1 && streak < days.value.length)
    out.push({ key: 'streak', label: t('report.time.streak'), value: nbsp(tc('report.time.days', streak)) })
  if (days.value.length > 1)
    out.push({
      key: 'active',
      label: t('report.time.active'),
      value: t('report.time.activeOf', { active: formatNumber(active), total: formatNumber(days.value.length) }),
    })
  return out
})
</script>

<template>
  <ReportSection v-if="window && answer" id="part-time" wide :title="t('report.time.title')" :answer="answer">
    <HourlyChart :hourly="report.activity.hourly" :peak="peakHours" />
    <dl v-if="facts.length" class="facts">
      <div v-for="fact in facts" :key="fact.key" class="facts__item">
        <dt class="t-label">{{ fact.label }}</dt>
        <dd class="t-body">{{ fact.value }}</dd>
      </div>
    </dl>
  </ReportSection>
</template>

<style scoped>
.facts {
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  gap: var(--space-3);
  padding-top: var(--space-3);
  box-shadow: var(--divider-top);
}

.facts__item {
  display: flex;
  flex-direction: column-reverse;
  justify-content: flex-end;
  gap: var(--space-0-5);
  min-width: 0;
}

.facts dt {
  color: var(--text-muted);
}

.facts dd {
  overflow-wrap: anywhere;
}
</style>

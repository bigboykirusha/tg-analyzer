<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { personaOf } from '../../lib/persona'

/**
 * «Ваше время», the one dashboard of the day's rhythm, each fact once: the part of the day around
 * the usual window as the answer (lib/persona, as in «Итоги»), the peak window (`availabilityProfile.peakWindow`, as
 * in «Итоги») under the title and lit on the 24 hours, and the four parts of the day as a band
 * under the same hours. The weekdays have the heatmap below.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber } = useI18n()
const name = computed(() => props.data.summary.title)

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

/** 24 columns of the whole chat: you at the foot in ink, the other side on top in lime. */
const hours = computed(() => {
  const hourly = props.data.report.activity.hourly
  const max = Math.max(1, ...hourly.map((hour) => hour.sent + hour.received))
  return Array.from({ length: 24 }, (_, hour) => {
    const sent = hourly[hour]?.sent ?? 0
    const received = hourly[hour]?.received ?? 0
    return {
      hour,
      peak: inPeak(hour),
      mine: (sent / max) * 100,
      theirs: (received / max) * 100,
      title: `${hour}:00 · ${t('report.you')} ${formatNumber(sent)} · ${name.value} ${formatNumber(received)}`,
    }
  })
})
const summary = computed(() => {
  const hourly = props.data.report.activity.hourly
  const sum = (key: 'sent' | 'received') => hourly.reduce((total, hour) => total + hour[key], 0)
  return t('chart.hourlySummary', { sent: formatNumber(sum('sent')), received: formatNumber(sum('received')) })
})

/** «Ночные совы: чаще всего с 22:00 до 01:00» — the same sentence the chapter opens with. */
const headlines = useChapterHeadlines(() => props.data)
const answer = computed(
  () => headlines.value.find((headline) => headline.id === 'time')?.text ?? t(`story.persona.${role.value!}`),
)
</script>

<template>
  <ReportSection v-if="window && role" :title="t('report.fmt.clockTitle')" :answer="answer" wide>
    <figure class="day">
      <ul class="day__legend" aria-hidden="true">
        <li class="day__key day__key--mine">{{ t('report.you') }}</li>
        <li class="day__key day__key--theirs">{{ name }}</li>
      </ul>
      <div class="day__hours" role="img" :aria-label="summary">
        <div
          v-for="hour in hours"
          :key="hour.hour"
          class="day__hour"
          :class="{ 'day__hour--peak': hour.peak }"
          :title="hour.title"
        >
          <i class="day__theirs" :style="{ height: `${hour.theirs}%` }" />
          <i class="day__mine" :style="{ height: `${hour.mine}%` }" />
        </div>
      </div>
      <!-- The four parts of the day under their own six hours each: the share said once, here. -->
      <ol class="day__parts">
        <li v-for="part in parts" :key="part.key" :class="{ 'is-peak': part.role === role }">
          <b class="t-num">{{ Math.round(part.share) }}%</b>
          <span>{{ t(part.label) }}</span>
        </li>
      </ol>
    </figure>
  </ReportSection>
</template>

<style scoped>
.day {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
  margin: 0;
}

.day__legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-4);
  margin: 0;
  padding: 0;
  color: var(--text-muted);
  font: var(--text-caption);
  list-style: none;
}

.day__key {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.day__key::before {
  content: '';
  flex: none;
  width: var(--space-2);
  height: var(--space-2);
  border-radius: var(--radius-full);
}

.day__key--mine::before {
  background: var(--you);
}

.day__key--theirs::before {
  background: var(--them);
}

/* 24 columns without gaps, so the peak hours join into one lit band behind their bars. */
.day__hours {
  display: grid;
  grid-template-columns: repeat(24, minmax(0, 1fr));
  height: calc(var(--chart-h-sm) - var(--space-20));
}

.day__hour {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 1px;
  padding-top: var(--space-2);
}

.day__hour--peak {
  background: var(--chart-peak);
}

.day__hour--peak:first-child,
.day__hour:not(.day__hour--peak) + .day__hour--peak {
  border-top-left-radius: 3px;
}

.day__hour--peak:last-child,
.day__hour--peak:has(+ .day__hour:not(.day__hour--peak)) {
  border-top-right-radius: 3px;
}

.day__hour i {
  flex: none;
  width: 64%;
  max-width: var(--space-4);
}

.day__theirs {
  border-radius: var(--radius-mark) var(--radius-mark) 0 0;
  background: var(--them);
}

.day__mine {
  background: var(--you);
}

.day__theirs[style*='height: 0%'] + .day__mine {
  border-radius: var(--radius-mark) var(--radius-mark) 0 0;
}

/* The parts of the day: each under its six hours, the leading one lit. */
.day__parts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-0-5);
  margin: 0;
  padding: 0;
  list-style: none;
}

.day__parts li {
  display: grid;
  justify-items: center;
  min-width: 0;
  padding-top: var(--space-2);
  box-shadow: var(--divider-top);
  color: var(--text-muted);
  font: var(--text-caption);
  text-align: center;
}

/* The share of each part of the day, said right under its six hours. */
.day__parts b {
  color: var(--text);
  font: var(--text-small);
  font-weight: 600;
}

.day__parts .is-peak b {
  color: var(--them-ink);
}
</style>

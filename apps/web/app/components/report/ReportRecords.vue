<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Calendar, Flame, Hourglass, Timer } from '../../lib/icons'

/**
 * Personal records as four equal wells with icons: the longest streak, the longest conversation,
 * the busiest day and the longest pause. No footer: how long and how often
 * you talk is not a record. The longest voice message has a card of its own.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber, formatDuration, formatDay } = useI18n()

const report = computed(() => props.data.report)
const name = computed(() => props.data.summary.title)
const day = (value: string | null | undefined) =>
  value ? formatDay(value.slice(0, 10), { day: 'numeric', month: 'long' }) : ''

const streak = computed(() => report.value.facts.maxStreak)

const records = computed(() => {
  const { facts, sessions } = report.value
  const out: { key: string; icon: unknown; value: string; label: string }[] = []
  if (streak.value.days > 1)
    out.push({
      key: 'streak',
      icon: Flame,
      value: tc('report.fmt.streakDays', streak.value.days),
      label: t('report.fmt.streakNote'),
    })
  const session = sessions.highlights[0]
  if (session)
    out.push({
      key: 'session',
      icon: Timer,
      value: formatDuration(session.durationSec),
      label: t('report.fmt.recordSession', { date: day(session.startedAt) }),
    })
  if (facts.mostActiveDate)
    out.push({
      key: 'day',
      icon: Calendar,
      value: formatNumber(facts.mostActiveDate.total),
      label: t('report.fmt.recordDay', { date: day(facts.mostActiveDate.date) }),
    })
  const gap = facts.longestGap
  if (gap)
    out.push({
      key: 'gap',
      icon: Hourglass,
      value: tc('insight.days', Math.max(1, Math.round(gap.seconds / 86400))),
      label:
        gap.brokenByMe === undefined
          ? t('report.fmt.recordGap')
          : gap.brokenByMe
            ? t('report.fmt.recordGapBrokenMine')
            : t('report.fmt.recordGapBroken', { who: name.value }),
    })
  return out
})
</script>

<template>
  <ReportSection v-if="records.length" wide :title="t('report.fmt.recordsTitle')">
    <dl class="records" :style="{ '--records': records.length }">
      <div v-for="record in records" :key="record.key" class="records__cell">
        <component :is="record.icon" class="records__icon icon-md" aria-hidden="true" />
        <dt class="records__label">{{ record.label }}</dt>
        <dd class="records__value t-num">{{ record.value }}</dd>
      </div>
    </dl>
  </ReportSection>
</template>

<style scoped>
.records {
  display: grid;
  grid-template-columns: repeat(var(--records), minmax(0, 1fr));
  gap: var(--space-2);
  margin: 0;
}

.records__cell {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--surface-2);
}

.records__icon {
  color: var(--text-muted);
}

.records__value {
  margin: 0;
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
}

/* The label comes first for screen readers (dt before dd) and shows under the value. */
.records__label {
  order: 1;
  color: var(--text-muted);
  font: var(--text-small);
}

@media (max-width: 900px) {
  .records {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .records {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

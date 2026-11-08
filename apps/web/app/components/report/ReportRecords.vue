<script setup lang="ts">
import { fillDailyGaps, type ReportDto } from '@tg-analyzer/shared'

/**
 * Personal records as one strip of four values, divided by hairlines: the longest streak, the longest conversation,
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
  const out: { key: string; value: string; label: string }[] = []
  // A streak as long as the whole chat is the calendar's answer («208 из 208 дней»), not a record.
  if (streak.value.days > 1 && streak.value.days < fillDailyGaps(report.value.activity.daily).length)
    out.push({
      key: 'streak',
      value: tc('report.fmt.streakDays', streak.value.days),
      label: t('report.fmt.streakNote'),
    })
  const session = sessions.highlights[0]
  if (session)
    out.push({
      key: 'session',
      value: formatDuration(session.durationSec),
      label: t('report.fmt.recordSession', { date: day(session.startedAt) }),
    })
  if (facts.mostActiveDate)
    out.push({
      key: 'day',
      value: formatNumber(facts.mostActiveDate.total),
      label: t('report.fmt.recordDay', { date: day(facts.mostActiveDate.date) }),
    })
  const gap = facts.longestGap
  if (gap)
    out.push({
      key: 'gap',
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
    <dl class="records">
      <div v-for="record in records" :key="record.key" class="records__cell">
        <dt class="records__label">{{ record.label }}</dt>
        <dd class="records__value t-num">{{ record.value }}</dd>
      </div>
    </dl>
  </ReportSection>
</template>

<style scoped>
/* A column: each value large, the sentence with its date under it, hairlines between the rows. */
.records {
  display: grid;
  margin: 0;
}

.records__cell {
  display: grid;
  gap: var(--space-0-5);
  min-width: 0;
  padding: var(--space-3) 0;
  box-shadow: var(--divider-top);
}

.records__cell:first-child {
  padding-top: 0;
  box-shadow: none;
}

.records__cell:last-child {
  padding-bottom: 0;
}

.records__value {
  margin: 0;
  font: var(--text-h1);
  letter-spacing: var(--tracking-h1);
}

/* The label comes first for screen readers (dt before dd) and shows under the value. */
.records__label {
  order: 1;
  color: var(--text-muted);
  font: var(--text-small);
}
</style>

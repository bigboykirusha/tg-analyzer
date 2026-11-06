<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Calendar, Flame, Hourglass, Timer } from '../../lib/icons'

/**
 * Personal records as four wells with icons: the longest streak (with a chain of its days), the
 * longest conversation, the busiest day and the longest pause. No footer: how long and how often
 * you talk is not a record. The longest voice message has a card of its own.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber, formatDuration, formatDay } = useI18n()

/** More days than this are drawn as the first ones. */
const MAX_CHAIN = 30

const report = computed(() => props.data.report)
const name = computed(() => props.data.summary.title)
const day = (value: string | null | undefined) =>
  value ? formatDay(value.slice(0, 10), { day: 'numeric', month: 'long' }) : ''

const streak = computed(() => report.value.facts.maxStreak)
const chain = computed(() => Math.min(MAX_CHAIN, streak.value.days))

const records = computed(() => {
  const { facts, sessions } = report.value
  const out: { key: string; icon: unknown; value: string; label: string; chain?: boolean }[] = []
  if (streak.value.days > 1)
    out.push({
      key: 'streak',
      icon: Flame,
      value: tc('report.fmt.streakDays', streak.value.days),
      label: t('report.fmt.streakNote'),
      chain: true,
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
          : t('report.fmt.recordGapBroken', { who: gap.brokenByMe ? t('report.fmt.byYou') : name.value }),
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
        <div v-if="record.chain" class="records__chain" :style="{ '--days': chain }" aria-hidden="true">
          <i v-for="index in chain" :key="index" />
        </div>
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

/* The streak's days in one row, neutral: the streak belongs to both of you. */
.records__chain {
  order: 2;
  display: grid;
  grid-template-columns: repeat(var(--days), minmax(0, 1fr));
  gap: 2px;
}

.records__chain i {
  height: var(--space-2);
  border-radius: 3px;
  background: var(--chart-neutral-strong);
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

<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { Flame } from '../../lib/icons'

/**
 * Personal records, Strava-style: the longest streak with a strip of its days, then the other
 * bests in a grid, and the slow facts of the chat in a quiet row at the end.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber, formatDuration, formatDay, formatMonth } = useI18n()

/** More days than this are drawn as the first ones and a count. */
const MAX_STRIP = 60

const report = computed(() => props.data.report)
const name = computed(() => props.data.summary.title)
const day = (value: string | null | undefined) =>
  value ? formatDay(value.slice(0, 10), { day: 'numeric', month: 'long' }) : ''

const streak = computed(() => report.value.facts.maxStreak)
const strip = computed(() => Math.min(MAX_STRIP, streak.value.days))

const records = computed(() => {
  const { facts, sessions, voice } = report.value
  const out: { key: string; value: string; label: string }[] = []
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
  const longest = voice?.voice.longest
  if (longest)
    out.push({
      key: 'voice',
      value: formatDuration(longest.seconds),
      label: t('report.fmt.recordVoice', { who: longest.mine ? t('report.fmt.yours') : name.value }),
    })
  const gap = facts.longestGap
  if (gap)
    out.push({
      key: 'gap',
      value: tc('insight.days', Math.max(1, Math.round(gap.seconds / 86400))),
      label:
        gap.brokenByMe === undefined
          ? t('report.fmt.recordGap')
          : t('report.fmt.recordGapBroken', { who: gap.brokenByMe ? t('report.fmt.byYou') : name.value }),
    })
  return out
})

const silenceDays = computed(() =>
  Math.round(report.value.facts.silencesOver30Days.reduce((sum, gap) => sum + gap.seconds, 0) / 86400),
)
const quiet = computed(() => [
  ...(report.value.period.firstMessageAt
    ? [{ key: 'first', label: t('report.timeline.firstMessage'), value: day(report.value.period.firstMessageAt) }]
    : []),
  { key: 'month', label: t('report.timeline.mostActiveMonth'), value: formatMonth(report.value.facts.mostActiveMonth) },
  { key: 'trend', label: t('report.timeline.trend'), value: t(`report.trend.${report.value.facts.trend}`) },
  {
    key: 'silences',
    label: t('report.timeline.silences'),
    value: silenceDays.value
      ? `${formatNumber(report.value.facts.silencesOver30Days.length)} · ${tc('report.timeline.silenceDays', silenceDays.value)}`
      : formatNumber(report.value.facts.silencesOver30Days.length),
  },
])
</script>

<template>
  <ReportSection wide :title="t('report.fmt.recordsTitle')">
    <div class="records">
      <div v-if="streak.days > 1" class="streak">
        <p class="streak__head">
          <Flame class="streak__icon" aria-hidden="true" />
          <span class="streak__figure t-num">{{ tc('report.fmt.streakDays', streak.days) }}</span>
        </p>
        <p class="streak__note">{{ t('report.fmt.streakNote') }}</p>
        <div class="streak__strip" aria-hidden="true">
          <i v-for="index in strip" :key="index" />
        </div>
      </div>
      <dl v-if="records.length" class="board">
        <div v-for="record in records" :key="record.key" class="board__cell">
          <dt class="board__label">{{ record.label }}</dt>
          <dd class="board__value t-num">{{ record.value }}</dd>
        </div>
      </dl>
    </div>
    <dl class="quiet">
      <div v-for="item in quiet" :key="item.key">
        <dt>{{ item.label }}</dt>
        <dd class="t-num">{{ item.value }}</dd>
      </div>
    </dl>
  </ReportSection>
</template>

<style scoped>
.records {
  display: grid;
  gap: var(--space-5);
}

@media (min-width: 901px) {
  .records {
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
    align-items: start;
  }
}

.streak {
  display: grid;
  gap: var(--space-2);
}

.streak__head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.streak__icon {
  width: var(--icon-lg);
  height: var(--icon-lg);
  color: var(--them-ink);
}

.streak__figure {
  font: var(--text-figure);
  letter-spacing: var(--tracking-figure);
}

.streak__note {
  color: var(--text-muted);
  font: var(--text-small);
}

.streak__strip {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8px, 1fr));
  gap: 2px;
}

.streak__strip i {
  height: 14px;
  border-radius: 3px;
  background: var(--them);
}

.board {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  margin: 0;
  overflow: hidden;
  border-radius: var(--radius-md);
  background: var(--border);
}

.board__cell {
  display: grid;
  align-content: start;
  gap: var(--space-1);
  padding: var(--space-4);
  background: var(--surface);
}

.board__value {
  order: -1;
  margin: 0;
  font: var(--text-figure-sm);
}

.board__label {
  color: var(--text-muted);
  font: var(--text-small);
}

.quiet {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-6);
  margin: 0;
  padding-top: var(--space-3);
  border-top: 1px solid var(--border);
}

.quiet div {
  display: flex;
  gap: var(--space-2);
  font: var(--text-small);
}

.quiet dt {
  color: var(--text-muted);
}

.quiet dd {
  margin: 0;
  font-weight: 600;
}
</style>

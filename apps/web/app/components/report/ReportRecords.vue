<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * Personal records, Strava-style: the longest streak with a strip of its days, then the other
 * bests in a grid, and how long and how often you talk in a quiet row at the end.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber, formatDecimal, formatDuration, formatDay } = useI18n()

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

/** How you talk in conversations, in the quiet row under the bests (it was a card of its own). */
const sessions = computed(() => report.value.sessions)
const quiet = computed(() => [
  {
    key: 'perWeek',
    label: t('report.sessions.perWeek'),
    value: formatDecimal(sessions.value.sessionsPerActiveWeek),
  },
  {
    key: 'size',
    label: t('report.sessions.averageSize'),
    value: tc('common.messagesCount', sessions.value.averageSessionMessages),
  },
])
</script>

<template>
  <ReportSection
    wide
    :title="t('report.fmt.recordsTitle')"
    :answer="streak.days > 1 ? `${tc('report.fmt.streakDays', streak.days)} ${t('report.fmt.streakNote')}` : null"
  >
    <div class="records">
      <div v-if="streak.days > 1" class="streak">
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
    <dl class="fact-line">
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
  font: var(--text-h3);
  letter-spacing: var(--tracking-h3);
}

.board__label {
  color: var(--text-muted);
  font: var(--text-small);
}
</style>

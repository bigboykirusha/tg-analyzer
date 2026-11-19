<script setup lang="ts">
import { isEven, MIN_CONVERSATIONS, MIN_HABIT_EVENTS, type ReportDto } from '@tg-analyzer/shared'
import { MessageSquare } from '../../lib/icons'

const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber, formatPercent } = useI18n()
const { name, me, rows: balance } = useBalance(() => props.data)

const rows = computed(() => {
  const { report, derived } = props.data
  const habits = report.habits
  const starts = balance.value.find((row) => row.key === 'starts')
  const speed = balance.value.find((row) => row.key === 'speed')
  const last = habits?.lastWordMinePct

  function count(
    key: 'questions' | 'unanswered' | 'double' | 'laughs',
    value: { mine: number; theirs: number } | undefined,
  ) {
    if (!value || value.mine + value.theirs < MIN_HABIT_EVENTS) return null
    return {
      key,
      label: t(`report.conversation.${key}`),
      left: formatNumber(value.mine),
      right: formatNumber(value.theirs),
    }
  }

  return [
    starts ? { ...starts, label: t('report.conversation.starts') } : null,
    last != null && report.sessions.totalSessions >= MIN_CONVERSATIONS
      ? {
          key: 'lastWord',
          label: t('report.conversation.lastWord'),
          left: formatPercent(last),
          right: formatPercent(100 - last),
        }
      : null,
    speed ? { ...speed, label: t('report.conversation.speed') } : null,
    derived.habitRows.skipped.includes('questions') ? null : count('questions', habits?.questionTurns),
    count('unanswered', habits?.unansweredQuestions),
    count('double', habits?.doubleTexts),
    derived.habitRows.skipped.includes('laughs') ? null : count('laughs', habits?.laughs),
  ].filter((row) => row != null)
})

const answer = computed(() => {
  const starts = balance.value.find((row) => row.key === 'starts')
  if (!starts || isEven(starts.mine, starts.theirs)) return null
  return starts.mine > starts.theirs
    ? t('report.conversation.startsMine')
    : t('report.conversation.startsTheirs', { name: name.value })
})
</script>

<template>
  <ReportSection
    v-if="rows.length"
    id="part-match"
    :icon="MessageSquare"
    :title="t('report.conversation.title')"
    :answer="answer"
  >
    <table class="conversation t-label">
      <thead>
        <tr>
          <th scope="col">
            <span class="sr-only">{{ t('report.conversation.metric') }}</span>
          </th>
          <th scope="col">{{ me }}</th>
          <th class="conversation__them" scope="col">{{ name }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.key">
          <th scope="row">{{ row.label }}</th>
          <td class="tnum">{{ row.left }}</td>
          <td class="conversation__them tnum">{{ row.right }}</td>
        </tr>
      </tbody>
    </table>
  </ReportSection>
</template>

<style scoped>
.conversation {
  width: 100%;
  border-collapse: collapse;
  text-align: right;
}

.conversation th,
.conversation td {
  padding: var(--space-1) 0 var(--space-1) var(--space-3);
  vertical-align: baseline;
}

.conversation th {
  font: inherit;
}

.conversation thead th {
  max-width: 10rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation tbody tr {
  border-top: 1px solid var(--border);
}

.conversation tbody th {
  padding-left: 0;
  color: var(--text-muted);
  text-align: left;
}

.conversation td {
  white-space: nowrap;
}

.conversation tbody tr:last-child > * {
  padding-block-end: 0;
}

.conversation__them {
  color: var(--them-ink);
}
</style>

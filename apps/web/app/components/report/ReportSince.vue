<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/**
 * «С прошлого анализа» (card 18): only after a chat was analysed again and something new was written.
 * The answer is how many messages came since; under it, rows «было → стало» for your reply time and
 * who starts the conversations — the same snapshot (`previous`) the report keeps.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber, formatDuration, formatDate } = useI18n()

const previous = computed(() => (props.data.report.group ? null : props.data.previous))

/** «вы», «Мила» or «поровну»: who starts more, from the share of conversations you start. */
function starter(pct: number) {
  if (pct > 55) return t('report.since.starterMine')
  if (pct < 45) return props.data.summary.title
  return t('report.since.starterEven')
}

const view = computed(() => {
  const before = previous.value
  if (!before) return null
  const { totals, responses } = props.data.report
  const added = totals.messages - before.messages
  // Nothing new since then: every number is as before, and the card would say nothing.
  if (added <= 0) return null
  const rows: { key: string; label: string; from: string; to: string }[] = []
  const now = responses.medianMineSec
  const then = before.medianMineSec
  if (now !== null && then !== null)
    rows.push({ key: 'reply', label: t('report.since.reply'), from: formatDuration(then), to: formatDuration(now) })
  const starts = responses.iWriteFirstPct
  const startsBefore = before.iWriteFirstPct
  if (starts !== null && startsBefore !== null)
    rows.push({ key: 'starts', label: t('report.since.starts'), from: starter(startsBefore), to: starter(starts) })
  return {
    title: t('report.since.titleDate', { date: formatDate(before.analyzedAt, { day: 'numeric', month: 'long' }) }),
    answer: t('report.since.added', { count: formatNumber(added) }),
    rows,
  }
})
</script>

<template>
  <ReportSection v-if="view" :title="view.title" :answer="view.answer" class="since">
    <dl v-if="view.rows.length" class="since__rows">
      <div v-for="row in view.rows" :key="row.key" class="since__row">
        <dt>{{ row.label }}</dt>
        <dd class="t-num">
          {{ row.from }}<span class="since__arrow" aria-hidden="true">→</span
          ><span class="sr-only">{{ t('report.since.became') }}</span
          >{{ row.to }}
        </dd>
      </div>
    </dl>
  </ReportSection>
</template>

<style scoped>
.since__rows {
  display: grid;
  margin: 0;
}

.since__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) 0;
  box-shadow: var(--divider-top);
}

.since__row dt {
  color: var(--text-muted);
  font: var(--text-ui);
  font-weight: 400;
}

.since__row dd {
  margin: 0;
  font: var(--text-title);
  font-weight: 600;
}

.since__arrow {
  margin: 0 var(--space-1);
  color: var(--text-muted);
  font-weight: 400;
}
</style>

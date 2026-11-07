<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { ArrowDown, ArrowUp } from '../../lib/icons'

/**
 * «С прошлого анализа»: a white strip under the hero, only after a chat was analysed again.
 * Three changes against the kept snapshot (`previous`): new messages, your reply time and who
 * starts the conversations. Each value shows what it was; the arrow says which way it went.
 * Without new messages there is nothing to tell, and the strip stays away.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, formatNumber, formatDuration, formatPercent, formatDate } = useI18n()

const previous = computed(() => (props.data.report.group ? null : props.data.previous))

/** Changes smaller than this are «as before»: a median moves a little with every new week. */
const REPLY_RATIO = 0.1
const STARTS_POINTS = 3

type Cell = { key: string; label: string; value: string; was: string; arrow: 'up' | 'down' | null }

const cells = computed<Cell[]>(() => {
  const before = previous.value
  if (!before) return []
  const { totals, responses } = props.data.report
  const out: Cell[] = []

  // Nothing new since then: every number is as before, the strip would say nothing.
  const added = totals.messages - before.messages
  if (added <= 0) return []
  out.push({
    key: 'messages',
    label: t('report.since.messages'),
    value: `+${formatNumber(added)}`,
    was: t('report.since.was', { value: formatNumber(before.messages) }),
    arrow: null,
  })

  const now = responses.medianMineSec
  const then = before.medianMineSec
  if (now !== null && then !== null && then > 0) {
    const change = (now - then) / then
    out.push({
      key: 'reply',
      label:
        change <= -REPLY_RATIO
          ? t('report.since.replyFaster')
          : change >= REPLY_RATIO
            ? t('report.since.replySlower')
            : t('report.since.replySame'),
      value: formatDuration(now),
      was: t('report.since.was', { value: formatDuration(then) }),
      arrow: Math.abs(change) < REPLY_RATIO ? null : change < 0 ? 'down' : 'up',
    })
  }

  const starts = responses.iWriteFirstPct
  const startsBefore = before.iWriteFirstPct
  if (starts !== null && startsBefore !== null) {
    const diff = starts - startsBefore
    out.push({
      key: 'starts',
      label:
        diff >= STARTS_POINTS
          ? t('report.since.startsMore')
          : diff <= -STARTS_POINTS
            ? t('report.since.startsLess', { name: props.data.summary.title })
            : t('report.since.startsSame'),
      value: formatPercent(starts),
      was: t('report.since.was', { value: formatPercent(startsBefore) }),
      arrow: Math.abs(diff) < STARTS_POINTS ? null : diff > 0 ? 'up' : 'down',
    })
  }
  return out
})

const since = computed(() =>
  previous.value ? formatDate(previous.value.analyzedAt, { day: 'numeric', month: 'long' }) : '',
)
</script>

<template>
  <section v-if="cells.length" class="tile since" :aria-label="t('report.since.title')">
    <header class="since__head">
      <h2 class="since__title">{{ t('report.since.title') }}</h2>
      <span class="since__range">{{ t('report.since.range', { date: since }) }}</span>
    </header>
    <dl class="since__cells">
      <div v-for="cell in cells" :key="cell.key" class="since__cell">
        <dt class="since__label">{{ cell.label }}</dt>
        <dd class="since__value t-num">
          <span v-if="cell.arrow" class="since__arrow" aria-hidden="true">
            <ArrowUp v-if="cell.arrow === 'up'" />
            <ArrowDown v-else />
          </span>
          {{ cell.value }}
        </dd>
        <dd class="since__was t-num">{{ cell.was }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.since__head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2) var(--space-4);
}

.since__title {
  font: var(--text-title);
}

.since__range {
  color: var(--text-muted);
  font: var(--text-small);
}

.since__cells {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(0, 1fr));
  grid-auto-flow: column;
  gap: var(--space-4);
  margin: 0;
}

.since__cell {
  display: grid;
  align-content: start;
  gap: var(--space-1);
  min-width: 0;
  padding-left: var(--space-4);
  border-left: 1px solid var(--border);
}

.since__cell:first-child {
  padding-left: 0;
  border-left: 0;
}

.since__label,
.since__was {
  margin: 0;
  color: var(--text-muted);
}

.since__label {
  font: var(--text-small);
}

.since__was {
  font: var(--text-caption);
}

.since__value {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
}

/* The direction in a lime dot: lime marks data, never a button. */
.since__arrow {
  display: grid;
  flex: none;
  place-items: center;
  width: var(--icon-lg);
  height: var(--icon-lg);
  border-radius: var(--radius-full);
  background: var(--lime);
  color: var(--on-lime);
}

/* Phone: one row per change, the value on the right. */
@media (max-width: 640px) {
  .since__cells {
    grid-auto-flow: row;
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }

  .since__cell {
    grid-template-columns: minmax(0, 1fr) auto;
    padding: var(--space-3) 0;
    border-top: 1px solid var(--border);
    border-left: 0;
  }

  .since__cell:first-child {
    padding-top: 0;
    border-top: 0;
  }

  .since__value {
    grid-row: span 2;
    grid-column: 2;
    font: var(--text-title);
  }
}
</style>

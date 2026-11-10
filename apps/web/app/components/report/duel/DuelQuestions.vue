<script setup lang="ts">
import type { Versus } from '../../../composables/useVersus'

/** Questions as a unit chart: one square is a fixed number of questions, so the gap is counted by eye. */
const props = defineProps<{ item: Versus; theirName: string }>()
const { t, tc, formatNumber } = useI18n()
/** «2», «3,2»: one decimal, no trailing «,0». */
const times = (value: number) => formatNumber(Math.round(value * 10) / 10)

const pair = computed(() => props.item.pairs[0]!)
/** At most about 100 squares on both sides together (more is a block, not a count); a round step. */
const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]
const step = computed(() => {
  const total = pair.value.mine.value + pair.value.theirs.value
  return STEPS.find((value) => total / value <= 100) ?? 1000
})
const squares = (value: number) => (value > 0 ? Math.max(1, Math.round(value / step.value)) : 0)
/** The answer as one sentence, like «Кто отвечает быстрее»: «Вы спрашиваете в 3,2 раза чаще». */
const answer = computed(() => {
  const { lead, ratio } = props.item
  if (!lead) return t('report.fmt.questionsEven')
  if (!Number.isFinite(ratio))
    return lead === 'mine'
      ? t('report.fmt.questionsOnlyMine')
      : t('report.fmt.questionsOnlyTheirs', { name: props.theirName })
  return lead === 'mine'
    ? t('report.fmt.questionsMine', { ratio: times(ratio) })
    : t('report.fmt.questionsTheirs', { name: props.theirName, ratio: times(ratio) })
})
const rows = computed(() => [
  { key: 'mine', who: t('report.you'), side: pair.value.mine, cells: squares(pair.value.mine.value) },
  { key: 'theirs', who: props.theirName, side: pair.value.theirs, cells: squares(pair.value.theirs.value) },
])
</script>

<template>
  <ReportSection :title="item.title" :answer="answer">
    <div class="units">
      <template v-for="row in rows" :key="row.key">
        <span class="units__who" :class="`units__who--${row.key}`"
          >{{ row.who }}<span class="sr-only">: {{ row.side.text }}</span></span
        >
        <span class="units__grid" aria-hidden="true">
          <i v-for="index in row.cells" :key="index" :class="`units__cell--${row.key}`" />
        </span>
      </template>
    </div>
    <template #note>{{ tc('report.fmt.questionsStep', step, { count: formatNumber(step) }) }}</template>
  </ReportSection>
</template>

<style scoped>
/* Each side a row: its name in a narrow column, then its squares, wrapping. */
.units {
  display: grid;
  grid-template-columns: var(--space-12) minmax(0, 1fr);
  gap: var(--space-2) var(--space-3);
  align-items: start;
}

.units__who {
  overflow: hidden;
  color: var(--text-muted);
  font: var(--text-label);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.units__who--theirs {
  color: var(--them-ink);
}

.units__grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  padding-top: var(--space-1);
}

.units__grid i {
  width: var(--space-3);
  height: var(--space-3);
  border-radius: var(--radius-mark);
}

.units__cell--mine {
  background: var(--you);
}

.units__cell--theirs {
  background: var(--them);
}
</style>

<script setup lang="ts">
import type { Versus } from '../../../composables/useVersus'

/** Questions as a unit chart: one square is a fixed number of questions, so the gap is counted by eye. */
const props = defineProps<{ item: Versus; theirName: string }>()
const { t, formatNumber } = useI18n()
/** «2», «3,2»: one decimal, no trailing «,0». */
const times = (value: number) => formatNumber(Math.round(value * 10) / 10)

const pair = computed(() => props.item.pairs[0]!)
/** At most about 180 squares on both sides together; the step is a round number. */
const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]
const step = computed(() => {
  const total = pair.value.mine.value + pair.value.theirs.value
  return STEPS.find((value) => total / value <= 180) ?? 1000
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
  <ReportSection
    :title="item.title"
    :answer="answer"
    :sides="{ mine: pair.mine.text, theirs: pair.theirs.text, name: theirName }"
  >
    <div v-for="row in rows" :key="row.key" class="units">
      <span class="units__who">{{ row.who }}</span>
      <div class="units__grid" aria-hidden="true">
        <i v-for="index in row.cells" :key="index" :class="`units__cell--${row.key}`" />
      </div>
    </div>
  </ReportSection>
</template>

<style scoped>
.units {
  display: grid;
  gap: var(--space-2);
}

.units__who {
  color: var(--text-muted);
  font: var(--text-caption);
}

.units__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10px, 1fr));
  gap: 3px;
}

.units__grid i {
  aspect-ratio: 1;
  border-radius: 3px;
}

.units__cell--mine {
  background: var(--you);
}

.units__cell--theirs {
  background: var(--them);
}
</style>

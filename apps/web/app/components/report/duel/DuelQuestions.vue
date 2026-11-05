<script setup lang="ts">
import type { Versus } from '../../../composables/useVersus'

/** Questions as a unit chart: one square is a fixed number of questions, so the gap is counted by eye. */
const props = defineProps<{ item: Versus; theirName: string }>()
const { t } = useI18n()

const pair = computed(() => props.item.pairs[0]!)
/** At most about 180 squares on both sides together; the step is a round number. */
const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]
const step = computed(() => {
  const total = pair.value.mine.value + pair.value.theirs.value
  return STEPS.find((value) => total / value <= 180) ?? 1000
})
const squares = (value: number) => (value > 0 ? Math.max(1, Math.round(value / step.value)) : 0)
const rows = computed(() => [
  { key: 'mine', who: t('report.you'), side: pair.value.mine, cells: squares(pair.value.mine.value) },
  { key: 'theirs', who: props.theirName, side: pair.value.theirs, cells: squares(pair.value.theirs.value) },
])
</script>

<template>
  <ReportSection :title="item.title">
    <p class="lead">
      <span v-if="item.lead">{{ item.figure }}</span>
      <b>{{ item.lead ? item.note : item.figure }}</b>
    </p>
    <div v-for="row in rows" :key="row.key" class="units">
      <span class="units__who t-num">{{ row.who }} · {{ row.side.text }}</span>
      <div class="units__grid" aria-hidden="true">
        <i v-for="index in row.cells" :key="index" :class="`units__cell--${row.key}`" />
      </div>
    </div>
  </ReportSection>
</template>

<style scoped>
.lead {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-2);
}

.lead b {
  font: var(--text-figure);
  letter-spacing: var(--tracking-figure);
}

.lead span {
  color: var(--text-muted);
  font: var(--text-h3);
}

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

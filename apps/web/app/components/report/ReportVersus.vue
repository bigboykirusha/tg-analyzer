<script setup lang="ts">
import type { Versus } from '../../composables/useVersus'

/**
 * The body of a «who does more» card, after Apple Health highlights: the leader as one big
 * word, how far ahead in a line, then a bar per side with its value.
 */
const props = defineProps<{ item: Versus; theirName: string }>()
const { t } = useI18n()

const width = (value: number, pair: Versus['pairs'][number]) => {
  const max = Math.max(pair.mine.value, pair.theirs.value)
  return max > 0 ? `${Math.max(2, (value / max) * 100)}%` : '0%'
}
const sides = computed(() =>
  props.item.pairs.map((pair) => ({
    ...pair,
    rows: [
      { key: 'mine', label: t('report.you'), side: pair.mine, tone: 'mine' },
      { key: 'theirs', label: props.theirName, side: pair.theirs, tone: 'theirs' },
    ],
  })),
)
</script>

<template>
  <div class="versus">
    <p class="versus__lead">
      <span class="versus__figure">{{ item.figure }}</span>
      <span v-if="item.note" class="versus__note">{{ item.note }}</span>
    </p>
    <div v-for="pair in sides" :key="pair.key" class="versus__pair">
      <span v-if="pair.label" class="versus__label">{{ pair.label }}</span>
      <div v-for="row in pair.rows" :key="row.key" class="versus__row">
        <span class="versus__who">{{ row.label }}</span>
        <i class="versus__bar" aria-hidden="true">
          <b :class="`versus__fill--${row.tone}`" :style="{ width: width(row.side.value, pair) }" />
        </i>
        <span class="versus__value t-num">{{ row.side.text }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.versus {
  display: grid;
  gap: var(--space-4);
}

.versus__lead {
  display: grid;
  gap: var(--space-1);
}

.versus__figure {
  overflow: hidden;
  font: var(--text-figure);
  letter-spacing: -0.04em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.versus__note {
  color: var(--text-muted);
  font: var(--text-ui);
}

.versus__pair {
  display: grid;
  gap: var(--space-2);
}

.versus__label {
  color: var(--text-muted);
  font: var(--text-caption);
}

.versus__row {
  display: grid;
  grid-template-columns: minmax(0, 6rem) minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  color: var(--text-muted);
  font: var(--text-small);
}

.versus__who {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.versus__bar {
  display: block;
  height: var(--bar-height);
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--surface-2);
}

.versus__bar b {
  display: block;
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--transition-slow);
}

.versus__fill--mine {
  background: var(--you);
}

.versus__fill--theirs {
  background: var(--them);
}

.versus__value {
  color: var(--text);
  font: var(--text-ui);
  text-align: right;
}

@media (max-width: 640px) {
  .versus__row {
    grid-template-columns: minmax(0, 4.5rem) minmax(0, 1fr) auto;
  }
}
</style>

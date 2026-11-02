<script setup lang="ts">
import type { TopItemDto } from '@tg-analyzer/shared'

/**
 * A chart of favourites, after Spotify's top lists: number one large with its count,
 * the rest numbered, each with a bar against the leader.
 */
const props = withDefaults(
  defineProps<{ items: TopItemDto[]; empty: string; limit?: number; side?: 'mine' | 'theirs' }>(),
  { limit: 8, side: 'mine' },
)
const { formatNumber } = useI18n()

const leader = computed(() => props.items[0])
const rest = computed(() => props.items.slice(1, props.limit))
const width = (count: number) => `${Math.max(4, (count / (leader.value?.count || 1)) * 100)}%`
</script>

<template>
  <div v-if="leader" class="top">
    <p class="top__leader">
      <span class="top__rank t-num">1</span>
      <span class="top__word">{{ leader.value }}</span>
      <span class="top__count t-num">{{ formatNumber(leader.count) }}</span>
    </p>
    <ol class="top__list" start="2">
      <li v-for="(item, index) in rest" :key="item.value" class="top__row">
        <span class="top__rank t-num">{{ index + 2 }}</span>
        <span class="top__value">{{ item.value }}</span>
        <i class="top__bar" :class="`top__bar--${side}`" aria-hidden="true"
          ><b :style="{ width: width(item.count) }"
        /></i>
        <span class="top__num t-num">{{ formatNumber(item.count) }}</span>
      </li>
    </ol>
  </div>
  <p v-else class="t-small t-muted">{{ empty }}</p>
</template>

<style scoped>
.top {
  display: grid;
  gap: var(--space-4);
}

.top__leader {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: baseline;
  gap: var(--space-3);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border);
}

.top__word {
  overflow: hidden;
  font: var(--text-figure);
  letter-spacing: -0.04em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top__count {
  color: var(--text-muted);
  font: var(--text-ui);
}

.top__leader .top__rank {
  color: var(--them-ink);
  font: var(--text-h3);
}

.top__list {
  display: grid;
  gap: var(--space-3);
  list-style: none;
}

.top__row {
  display: grid;
  grid-template-columns: 1.5rem minmax(0, 7rem) minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  font: var(--text-ui);
}

.top__rank {
  color: var(--text-muted);
  font: var(--text-small);
}

.top__value {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top__bar {
  display: block;
  height: var(--bar-height);
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--surface-2);
}

.top__bar b {
  display: block;
  height: 100%;
  border-radius: var(--radius-full);
}

.top__bar--mine b {
  background: var(--you);
}

.top__bar--theirs b {
  background: var(--them);
}

.top__num {
  min-width: 3ch;
  color: var(--text-muted);
  font: var(--text-small);
  text-align: right;
}
</style>

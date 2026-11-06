<script setup lang="ts">
import type { TopItemDto } from '@tg-analyzer/shared'

/** Words or emoji as chips; `side` marks whose they are with a dot in that side's colour. */
withDefaults(defineProps<{ items: TopItemDto[]; empty: string; counts?: boolean; side?: 'mine' | 'theirs' }>(), {
  counts: true,
  side: undefined,
})
const { formatNumber } = useI18n()
</script>

<template>
  <div v-if="items.length" class="chips">
    <span v-for="item in items" :key="item.value" class="chip" :class="side && `chip--${side}`">
      {{ item.value }}
      <span v-if="counts" class="chip__count">{{ formatNumber(item.count) }}</span>
    </span>
  </div>
  <p v-else class="t-small t-muted">{{ empty }}</p>
</template>

<style scoped>
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  max-width: 100%;
  min-height: var(--control-xs);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  background: var(--surface-2);
  color: var(--text);
  font: var(--text-ui);
  overflow-wrap: anywhere;
}

.chip--mine::before,
.chip--theirs::before {
  content: '';
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
}

.chip--mine::before {
  background: var(--you);
}

.chip--theirs::before {
  background: var(--them);
}

.chip__count {
  flex: none;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  font: var(--text-caption);
}
</style>

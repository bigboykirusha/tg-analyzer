<script setup lang="ts">
import type { TopItemDto } from '@tg-analyzer/shared'

withDefaults(defineProps<{ items: TopItemDto[]; empty: string; counts?: boolean }>(), { counts: true })
const { formatNumber } = useI18n()
</script>

<template>
  <div v-if="items.length" class="chips">
    <span v-for="item in items" :key="item.value" class="chip">
      {{ item.value }}
      <span v-if="counts" class="chip__count t-mono">{{ formatNumber(item.count) }}</span>
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
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  background: var(--surface-2);
  font-size: 14px;
}

.chip__count {
  color: var(--text-muted);
  font-size: 12px;
}
</style>

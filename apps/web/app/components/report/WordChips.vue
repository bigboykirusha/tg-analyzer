<script setup lang="ts">
import type { TopItemDto } from '@tg-analyzer/shared'

/**
 * Words or emoji as chips, optionally with their counts. Whose they are is said by the row they stand
 * in and by the tone: yours grey, the other side's on their tint, shared ones outlined on white.
 */
withDefaults(
  defineProps<{ items: TopItemDto[]; empty?: string; counts?: boolean; tone?: 'mine' | 'theirs' | 'shared' }>(),
  { empty: '', counts: true, tone: 'mine' },
)
const { formatNumber } = useI18n()
</script>

<template>
  <ul v-if="items.length" class="chips" :class="`chips--${tone}`">
    <li v-for="item in items" :key="item.value" class="chip">
      {{ item.value }}<span v-if="counts" class="chip__count">{{ formatNumber(item.count) }}</span>
    </li>
  </ul>
  <p v-else-if="empty" class="chips-empty">{{ empty }}</p>
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
  min-height: var(--space-8);
  padding: 0 var(--space-3);
  border-radius: var(--radius-full);
  background: var(--surface-2);
  font: var(--text-small);
  overflow-wrap: anywhere;
}

.chips--theirs .chip {
  background: var(--room-tint);
}

.chips--shared .chip {
  background: var(--surface);
  box-shadow: var(--ring-strong);
}

.chip__count {
  flex: none;
  color: var(--text-muted);
}

.chips--theirs .chip__count {
  color: var(--text);
}

.chips-empty {
  color: var(--text-muted);
  font: var(--text-small);
}
</style>

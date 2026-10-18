<script setup lang="ts">
import type { TopItemDto } from '@tg-analyzer/shared'

defineProps<{
  items: TopItemDto[]
}>()
const { t, formatNumber } = useI18n()
</script>

<template>
  <div v-if="items.length" class="emoji-grid">
    <div v-for="item in items" :key="item.value" class="emoji-card">
      <span class="emoji-value">{{ item.value }}</span>
      <span class="emoji-count t-num">{{ formatNumber(item.count) }}</span>
    </div>
  </div>
  <div v-else class="emoji-empty t-small">{{ t('chat.noEmoji') }}</div>
</template>

<style scoped>
.emoji-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: var(--space-3);
}

.emoji-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  justify-content: center;
  min-height: 84px;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
  background: var(--surface);
}

.emoji-value {
  font-size: 32px;
  line-height: 1;
}

.emoji-count {
  color: var(--text);
}

.emoji-empty {
  padding: var(--space-6);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  text-align: center;
  color: var(--text-muted);
}
</style>

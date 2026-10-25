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
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-5);
}

.emoji-card {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-2);
}

.emoji-value {
  font-size: 28px;
  line-height: 36px;
}

.emoji-count {
  color: var(--text-muted);
  font: var(--text-ui);
}

.emoji-empty {
  color: var(--text-muted);
}
</style>

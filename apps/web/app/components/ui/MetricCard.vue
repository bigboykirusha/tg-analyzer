<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  sub?: string | null
}>()
</script>

<template>
  <div class="metric">
    <span class="metric-label t-label">{{ label }}</span>
    <span class="metric-value t-metric">{{ value }}</span>
    <span v-if="sub" class="metric-sub t-small">{{ sub }}</span>
  </div>
</template>

<style scoped>
.metric {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-4) var(--space-5);
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  min-width: 0;
}

.metric-label {
  color: var(--text-tertiary);
}

.metric-value {
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

.metric-sub {
  color: var(--text-secondary);
}
</style>

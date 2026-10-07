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
  display: grid;
  align-content: center;
  gap: var(--space-2);
  min-height: 86px;
  padding: var(--space-3) var(--space-4);
  background: color-mix(in srgb, var(--bg-elevated) 86%, transparent);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  min-width: 0;
}

.metric-label {
  /* inherits t-label: uppercase, tertiary color */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-value {
  /* inherits t-metric: mono, 28px */
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

.metric-sub {
  /* inherits t-small: 12px */
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}

@media (max-width: 640px) {
  .metric {
    min-height: 74px;
    padding: var(--space-3);
  }

  .metric-value {
    font-size: 22px;
  }
}
</style>

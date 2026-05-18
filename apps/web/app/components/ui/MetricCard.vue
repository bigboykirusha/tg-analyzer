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
  grid-template-columns: minmax(0, 1fr);
  align-content: center;
  gap: 6px;
  min-width: 0;
  min-height: 86px;
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--bg-elevated) 72%, transparent), var(--bg-surface));
  box-shadow: inset 0 1px 0 color-mix(in srgb, var(--text-primary) 4%, transparent);
}

.metric-label {
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-value {
  color: var(--text-primary);
  font-size: 24px;
  line-height: 1;
  letter-spacing: 0;
  overflow-wrap: anywhere;
}

.metric-sub {
  color: var(--text-secondary);
  line-height: 1.25;
  overflow-wrap: anywhere;
}

@media (max-width: 640px) {
  .metric {
    min-height: 74px;
    padding: var(--space-3);
  }

  .metric-value {
    font-size: 21px;
  }
}
</style>

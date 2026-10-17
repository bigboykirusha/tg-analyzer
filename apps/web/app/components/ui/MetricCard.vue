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
    <span class="metric-value">{{ value }}</span>
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
  background: color-mix(in srgb, var(--surface-2) 70%, transparent);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: none;
  min-width: 0;
}

.metric-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-value {
  color: var(--text);
  font-size: clamp(1.75rem, 3vw, 2.5rem);
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}

.metric-sub {
  color: var(--text-muted);
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

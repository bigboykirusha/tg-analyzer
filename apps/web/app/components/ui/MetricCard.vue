<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  sub?: string | null
}>()
</script>

<template>
  <div class="metric">
    <span class="metric-label">{{ label }}</span>
    <span class="metric-value mono-value">{{ value }}</span>
    <span v-if="sub" class="metric-sub">{{ sub }}</span>
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
}

.metric-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.metric-value {
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  line-height: 1;
}

.metric-sub {
  font-size: 12px;
  color: var(--text-secondary);
}
</style>

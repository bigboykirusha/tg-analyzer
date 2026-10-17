<script setup lang="ts">
defineProps<{
  label: string
  /** Already formatted, with a non-breaking space between digit groups. */
  value: string | number
  sub?: string | null
  /** Change, as neutral text: more messages is neither good nor bad. */
  delta?: string | null
}>()
</script>

<template>
  <div class="metric">
    <span class="metric-label t-label">{{ label }}</span>
    <span class="metric-value t-display">{{ value }}</span>
    <span v-if="sub || delta" class="metric-foot">
      <span v-if="delta" class="metric-delta">{{ delta }}</span>
      <span v-if="sub" class="metric-sub">{{ sub }}</span>
    </span>
  </div>
</template>

<style scoped>
.metric {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  min-width: 0;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--surface-2);
}

.metric-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-value {
  color: var(--text);
  overflow-wrap: anywhere;
}

.metric-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  color: var(--text-muted);
  font: var(--text-small);
}

.metric-delta {
  color: var(--text);
  font-weight: 600;
}

.metric-sub {
  min-width: 0;
  overflow-wrap: anywhere;
}
</style>

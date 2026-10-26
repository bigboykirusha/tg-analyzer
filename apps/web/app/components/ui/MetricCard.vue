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
    <span class="metric-value">{{ value }}</span>
    <span v-if="sub || delta" class="metric-foot">
      <span v-if="delta" class="metric-delta">{{ delta }}</span>
      <span v-if="sub" class="metric-sub">{{ sub }}</span>
    </span>
  </div>
</template>

<style scoped>
/* A small number tile of the report's bento grid. */
.metric {
  display: grid;
  align-content: start;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-5);
  border-radius: var(--radius-card);
  background: var(--surface);
}

.metric-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-value {
  overflow: hidden;
  color: var(--text);
  font: 600 36px/1 var(--font-sans);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.04em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .metric {
    padding: var(--space-4);
    border-radius: var(--radius-xl);
  }

  .metric-value {
    font-size: 28px;
  }
}

.metric-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  color: var(--text-muted);
  font: var(--text-small);
  font-weight: 500;
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

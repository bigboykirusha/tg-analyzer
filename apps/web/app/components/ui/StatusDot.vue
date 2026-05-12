<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'default' | 'info' | 'success' | 'warning' | 'danger' | 'accent'
  label?: string
}>(), {
  variant: 'default',
  label: '',
})

const title = computed(() => props.label || undefined)
</script>

<template>
  <span class="status-dot" :class="`status-dot-${variant}`" :title="title" :aria-label="label || undefined" />
</template>

<style scoped>
.status-dot {
  display: inline-flex;
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  flex: 0 0 auto;
  background: var(--text-tertiary);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.status-dot-default {
  background: var(--text-tertiary);
}

.status-dot-info {
  background: var(--color-info);
}

.status-dot-success {
  background: var(--color-success);
}

.status-dot-warning {
  background: var(--color-warning);
}

.status-dot-danger {
  background: var(--color-danger);
}

.status-dot-accent {
  background: var(--accent);
}
</style>

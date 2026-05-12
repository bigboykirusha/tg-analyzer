<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info'
}>(), {
  variant: 'default',
})
</script>

<template>
  <span class="badge" :class="`badge-${variant}`">
    <slot />
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 500;
  border: 1px solid transparent;
}

.badge::before {
  content: '';
  display: block;
  flex: 0 0 auto;
  align-self: center;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  transform: translateY(0.5px);
}

.badge-default {
  background: var(--bg-elevated);
  border-color: var(--border-subtle);
  color: var(--text-secondary);
}

.badge-accent {
  background: var(--accent-muted);
  border-color: transparent;
  color: var(--accent);
}

.badge-accent::before {
  transform: translateY(-1px);
}

.badge-success {
  background: var(--color-success-muted);
  color: var(--color-success);
}

.badge-warning {
  background: var(--color-warning-muted);
  color: var(--color-warning);
}

.badge-danger {
  background: var(--color-danger-muted);
  color: var(--color-danger);
}

.badge-info {
  background: var(--color-info-muted);
  color: var(--color-info);
}
</style>

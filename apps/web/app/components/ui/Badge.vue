<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'inactive' | 'cooldown'
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
  min-height: 24px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-full);
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
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
  color: var(--status-inactive);
}

.badge-accent {
  background: var(--accent-subtle);
  border-color: var(--accent-border);
  color: var(--accent);
}

.badge-success {
  background: var(--success-subtle);
  border-color: rgba(74, 222, 128, 0.2);
  color: var(--success);
}

.badge-warning {
  background: var(--warning-subtle);
  border-color: rgba(251, 191, 36, 0.2);
  color: var(--warning);
}

.badge-danger {
  background: var(--danger-subtle);
  border-color: rgba(248, 113, 113, 0.2);
  color: var(--danger);
}

.badge-info {
  background: var(--info-subtle);
  border-color: rgba(96, 165, 250, 0.2);
  color: var(--info);
}

.badge-pending {
  background: var(--warning-subtle);
  border-color: rgba(251, 191, 36, 0.2);
  color: var(--status-pending);
}

.badge-running {
  background: var(--accent-subtle);
  border-color: var(--accent-border);
  color: var(--status-running);
}

.badge-completed {
  background: var(--success-subtle);
  border-color: rgba(74, 222, 128, 0.2);
  color: var(--status-completed);
}

.badge-failed {
  background: var(--danger-subtle);
  border-color: rgba(248, 113, 113, 0.2);
  color: var(--status-failed);
}

.badge-cancelled {
  background: var(--bg-elevated);
  border-color: var(--border-default);
  color: var(--status-cancelled);
}

.badge-inactive {
  background: var(--bg-elevated);
  border-color: var(--border-subtle);
  color: var(--status-inactive);
}

.badge-cooldown {
  background: var(--info-subtle);
  border-color: rgba(96, 165, 250, 0.2);
  color: var(--status-cooldown);
}
</style>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  variant?: 'default' | 'info' | 'success' | 'warning' | 'danger' | 'accent' | 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'inactive' | 'cooldown'
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
  background: var(--status-inactive);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.04);
}

.status-dot-default {
  background: var(--status-inactive);
}

.status-dot-info {
  background: var(--info);
}

.status-dot-success {
  background: var(--success);
}

.status-dot-warning {
  background: var(--warning);
}

.status-dot-danger {
  background: var(--danger);
}

.status-dot-accent {
  background: var(--accent);
}

.status-dot-pending {
  background: var(--status-pending);
}

.status-dot-running {
  background: var(--status-running);
}

.status-dot-completed {
  background: var(--status-completed);
}

.status-dot-failed {
  background: var(--status-failed);
}

.status-dot-cancelled {
  background: var(--status-cancelled);
}

.status-dot-inactive {
  background: var(--status-inactive);
}

.status-dot-cooldown {
  background: var(--status-cooldown);
}
</style>

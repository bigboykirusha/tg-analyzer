<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  block?: boolean
}>(), {
  variant: 'secondary',
  size: 'md',
  loading: false,
  disabled: false,
  block: false,
})

const attrs = useAttrs()

const classes = computed(() => [
  'ui-button',
  `btn-${props.variant}`,
  `btn-${props.size}`,
  {
    'btn-block': props.block,
  },
])
</script>

<template>
  <button
    v-bind="attrs"
    :class="classes"
    :disabled="disabled || loading"
  >
    <span v-if="loading" class="btn-spinner" />
    <slot />
  </button>
</template>

<style scoped>
.ui-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-family: var(--font-sans);
  font-weight: 500;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  max-width: 100%;
  min-width: 0;
  white-space: normal;
  text-align: center;
  line-height: 1.2;
  border-radius: var(--radius-md);
}

.btn-block {
  width: 100%;
}

.btn-sm {
  height: 32px;
  padding: 0 var(--space-3);
  font-size: 13px;
}

.btn-md {
  height: 38px;
  padding: 0 var(--space-4);
  font-size: 14px;
}

.btn-lg {
  height: 44px;
  padding: 0 var(--space-6);
  font-size: 15px;
}

.btn-primary {
  background: var(--accent);
  color: var(--text-inverse);
  box-shadow: var(--shadow-accent);
}

.btn-primary:hover {
  background: var(--accent-dim);
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-secondary {
  background: transparent;
  border-color: var(--border-default);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--bg-overlay);
  border-color: var(--border-strong);
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
}

.btn-ghost:hover {
  background: var(--bg-overlay);
  color: var(--text-primary);
}

.btn-danger {
  background: transparent;
  border-color: var(--border-default);
  color: var(--color-danger);
}

.btn-danger:hover {
  background: var(--color-danger-muted);
  border-color: var(--color-danger);
}

.ui-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

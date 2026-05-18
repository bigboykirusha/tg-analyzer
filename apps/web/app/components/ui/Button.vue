<script setup lang="ts">
import type { Component } from 'vue'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: Component | null
  loading?: boolean
  disabled?: boolean
  block?: boolean
}>(), {
  variant: 'secondary',
  size: 'md',
  icon: null,
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
    <span v-if="loading || icon || $slots.icon" class="btn-icon" aria-hidden="true">
      <span v-if="loading" class="btn-spinner" />
      <component :is="icon" v-else-if="icon" />
      <slot v-else name="icon" />
    </span>
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
  font-weight: 600;
  border: 1px solid var(--border-default);
  cursor: pointer;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
  max-width: 100%;
  min-width: 0;
  min-height: 34px;
  white-space: normal;
  text-align: center;
  line-height: 1.2;
  border-radius: var(--radius-md);
}

.ui-button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--accent), 0 0 0 3px var(--bg-base);
}

.btn-block {
  width: 100%;
}

.btn-sm {
  min-height: 28px;
  padding: 0 var(--space-3);
  font-size: 12px;
}

.btn-md {
  min-height: 34px;
  padding: 0 var(--space-4);
  font-size: 14px;
}

.btn-lg {
  min-height: 34px;
  padding: 0 var(--space-4);
  font-size: 14px;
}

.btn-primary {
  background: var(--accent);
  border-color: transparent;
  color: var(--accent-text);
  box-shadow: var(--shadow-accent);
}

.btn-primary:hover {
  background: var(--accent-hover);
  transform: scale(0.99);
}

.btn-secondary {
  background: var(--bg-surface);
  border-color: var(--border-default);
  color: var(--text-primary);
}

.btn-secondary:hover {
  background: var(--bg-elevated);
  border-color: var(--border-strong);
}

.btn-ghost {
  background: transparent;
  border-color: transparent;
  color: var(--text-secondary);
}

.btn-ghost:hover {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.btn-danger {
  background: var(--danger-subtle);
  border-color: rgba(248, 113, 113, 0.2);
  color: var(--danger);
}

.btn-danger:hover {
  background: rgba(248, 113, 113, 0.16);
  border-color: rgba(248, 113, 113, 0.3);
}

.ui-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
}

.btn-sm .btn-icon {
  width: 14px;
  height: 14px;
}

.btn-lg .btn-icon {
  width: 18px;
  height: 18px;
}

.btn-icon :deep(svg) {
  width: 100%;
  height: 100%;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
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

@media (max-width: 640px) {
  .ui-button {
    min-height: 34px;
  }

  .btn-sm,
  .btn-md,
  .btn-lg {
    min-height: 34px;
  }
}
</style>

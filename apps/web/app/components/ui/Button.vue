<script setup lang="ts">
import type { Component } from 'vue'

defineOptions({ inheritAttrs: false })

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
  'btn',
  `btn--${props.variant}`,
  `btn--${props.size}`,
  { 'btn--block': props.block },
])
</script>

<template>
  <button v-bind="attrs" :class="classes" :disabled="disabled || loading">
    <span v-if="loading || icon || $slots.icon" class="btn__icon" aria-hidden="true">
      <span v-if="loading" class="btn__spinner" />
      <component :is="icon" v-else-if="icon" />
      <slot v-else name="icon" />
    </span>
    <slot />
  </button>
</template>

<style scoped>
/* ─── Base ─────────────────────────────────────────────────────────────────── */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-family: var(--font-sans);
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  white-space: normal;
  text-align: center;
  line-height: 1.2;
  min-width: 0;
  max-width: 100%;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast),
    opacity var(--transition-fast);
}

.btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--bg-base), 0 0 0 4px var(--accent);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

/* ─── Sizes ────────────────────────────────────────────────────────────────── */
.btn--sm {
  height: 28px;
  padding: 0 var(--space-3);
  font-size: 12px;
}

.btn--md {
  height: 34px;
  padding: 0 var(--space-4);
  font-size: 13px;
}

.btn--lg {
  height: 40px;
  padding: 0 var(--space-5);
  font-size: 14px;
}

.btn--block {
  width: 100%;
}

/* ─── Variants ─────────────────────────────────────────────────────────────── */
.btn--primary {
  background: var(--accent);
  border-color: transparent;
  color: var(--accent-text);
  box-shadow: var(--shadow-accent);
}

.btn--primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn--secondary {
  background: var(--bg-surface);
  border-color: var(--border-default);
  color: var(--text-primary);
}

.btn--secondary:hover:not(:disabled) {
  background: var(--bg-elevated);
  border-color: var(--border-strong);
}

.btn--ghost {
  background: transparent;
  border-color: transparent;
  color: var(--text-secondary);
}

.btn--ghost:hover:not(:disabled) {
  background: var(--bg-elevated);
  color: var(--text-primary);
}

.btn--danger {
  background: var(--danger-subtle);
  border-color: rgba(248, 113, 113, 0.20);
  color: var(--danger);
}

.btn--danger:hover:not(:disabled) {
  background: rgba(248, 113, 113, 0.16);
  border-color: rgba(248, 113, 113, 0.30);
}

/* ─── Icon slot ────────────────────────────────────────────────────────────── */
.btn__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

/* icon size follows button size */
.btn--sm .btn__icon {
  width: 14px;
  height: 14px;
}

.btn--md .btn__icon {
  width: 15px;
  height: 15px;
}

.btn--lg .btn__icon {
  width: 16px;
  height: 16px;
}

.btn__icon :deep(svg) {
  width: 100%;
  height: 100%;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* ─── Spinner ──────────────────────────────────────────────────────────────── */
.btn__spinner {
  width: 13px;
  height: 13px;
  border: 1.5px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: btn-spin 0.6s linear infinite;
}

@keyframes btn-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ─── Mobile ───────────────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .btn--sm {
    height: 32px;
  }

  .btn--md {
    height: 36px;
  }

  .btn--lg {
    height: 44px;
  }
}
</style>
<script setup lang="ts">
import type { Component } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    size?: 'sm' | 'md' | 'lg' | 'control'
    icon?: Component | null
    loading?: boolean
    disabled?: boolean
    block?: boolean
    iconOnly?: boolean
    to?: string
  }>(),
  {
    variant: 'secondary',
    size: 'md',
    icon: null,
    loading: false,
    disabled: false,
    block: false,
    iconOnly: false,
    to: '',
  },
)

const attrs = useAttrs()

const classes = computed(() => [
  'btn',
  `btn--${props.variant}`,
  `btn--${props.size}`,
  { 'btn--block': props.block, 'btn--icon-only': props.iconOnly },
])
</script>

<template>
  <NuxtLink v-if="to" v-bind="attrs" :to="to" :class="classes" :aria-busy="loading || undefined">
    <span v-if="icon || $slots.icon" class="btn__icon" aria-hidden="true">
      <span v-if="loading" class="btn__spinner" />
      <component :is="icon" v-else-if="icon" />
      <slot v-else name="icon" />
    </span>
    <slot />
  </NuxtLink>
  <button v-else v-bind="attrs" :class="classes" :disabled="disabled || loading" :aria-busy="loading || undefined">
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
  font-weight: 650;
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  cursor: pointer;
  white-space: normal;
  text-align: center;
  line-height: 1.2;
  min-width: 0;
  max-width: 100%;
  transition:
    transform var(--transition-fast),
    opacity var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.btn:active:not(:disabled) {
  transform: scale(0.97);
}

/* ─── Sizes ────────────────────────────────────────────────────────────────── */
.btn--sm {
  min-height: 36px;
  padding: 0 var(--space-3);
  font-size: 12px;
}

.btn--md {
  min-height: 44px;
  padding: 0 var(--space-4);
  font-size: 13px;
}

.btn--lg {
  min-height: 48px;
  padding: 0 var(--space-5);
  font-size: 14px;
}

.btn--control {
  min-height: 42px;
  padding: 0;
  font-size: 13px;
}

.btn--block {
  width: 100%;
}

.btn--icon-only {
  flex: 0 0 auto;
  padding: 0;
  border-radius: 50%;
}

.btn--icon-only.btn--sm {
  width: 36px;
}

.btn--icon-only.btn--md {
  width: 44px;
}

.btn--icon-only.btn--lg {
  width: 48px;
}

.btn--icon-only.btn--control {
  width: 42px;
  height: 42px;
}

/* ─── Variants ─────────────────────────────────────────────────────────────── */
.btn--primary {
  background: var(--accent);
  border-color: transparent;
  color: var(--accent-text);
  box-shadow: var(--shadow-accent);
}

.btn--secondary {
  background: transparent;
  border-color: var(--border-default);
  color: var(--text-primary);
}

.btn--ghost {
  background: transparent;
  border-color: transparent;
  color: var(--text-secondary);
}

.btn--danger {
  background: var(--danger-subtle);
  border-color: color-mix(in srgb, var(--danger) 30%, transparent);
  color: var(--danger);
}

@media (hover: hover) {
  .btn--primary:hover:not(:disabled) {
    background: var(--accent-hover);
    transform: translateY(-1px);
  }

  .btn--secondary:hover:not(:disabled) {
    background: var(--bg-elevated);
    border-color: var(--border-strong);
    transform: translateY(-1px);
  }

  .btn--ghost:hover:not(:disabled) {
    background: var(--bg-elevated);
    color: var(--text-primary);
  }

  .btn--danger:hover:not(:disabled) {
    background: color-mix(in srgb, var(--danger) 16%, transparent);
    border-color: color-mix(in srgb, var(--danger) 42%, transparent);
  }
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

.btn--control .btn__icon {
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
    min-height: 44px;
  }

  .btn--icon-only.btn--sm {
    width: 44px;
  }

  .btn--md {
    min-height: 44px;
  }

  .btn--lg {
    min-height: 48px;
  }
}
</style>

<script setup lang="ts">
import type { Component } from 'vue'

export type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger' | 'danger-soft'
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    /** sm 36 · md 44 · lg 48; xs 32 is for close icons only. */
    size?: ButtonSize
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
    <span v-if="loading" class="btn__spinner" aria-hidden="true" />
    <component :is="icon" v-else-if="icon" aria-hidden="true" />
    <slot v-else name="icon" />
    <slot />
  </NuxtLink>
  <button v-else v-bind="attrs" :class="classes" :disabled="disabled || loading" :aria-busy="loading || undefined">
    <span v-if="loading" class="btn__spinner" aria-hidden="true" />
    <component :is="icon" v-else-if="icon" aria-hidden="true" />
    <slot v-else name="icon" />
    <slot />
  </button>
</template>

<style scoped>
.btn {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-width: 0;
  max-width: 100%;
  min-height: var(--control-md);
  padding: 0 var(--space-5);
  border: 1px solid transparent;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font: var(--text-control);
  text-align: center;
  text-decoration: none;
  white-space: nowrap;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  --icon-size: var(--icon-sm);
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

/* ─── Sizes ────────────────────────────────────────────────────────────────── */
.btn--sm {
  min-height: var(--control-sm);
  padding: 0 var(--space-4);
  padding: 0 14px;
}

.btn--lg {
  min-height: var(--control-lg);
  padding: 0 var(--space-6);
  font-size: 15px;
  --icon-size: var(--icon-md);
}

.btn--block {
  width: 100%;
}

/* Icon-only: a circle, width equals height. */
.btn--icon-only {
  width: var(--control-md);
  padding: 0;
  border-radius: var(--radius-full);
  --icon-size: var(--icon-md);
}

.btn--icon-only.btn--sm {
  width: var(--control-sm);
  --icon-size: var(--icon-sm);
}

.btn--icon-only.btn--lg {
  width: var(--control-lg);
}

.btn--xs,
.btn--icon-only.btn--xs {
  width: var(--control-xs);
  min-height: var(--control-xs);
  padding: 0;
  --icon-size: var(--icon-sm);
}

/* The close button stays 32px but its hit area is 44px. */
.btn--xs::before {
  content: '';
  position: absolute;
  inset: calc((var(--control-md) - var(--control-xs)) / -2);
}

/* ─── Variants ─────────────────────────────────────────────────────────────── */
.btn--primary {
  background: var(--accent);
  color: var(--on-accent);
}

.btn--secondary {
  border-color: var(--border-strong);
  background: transparent;
  color: var(--text);
}

/* Soft: a quiet action that repeats down a list («Анализ»): a grey chip. */
.btn--soft {
  background: var(--surface-2);
  color: var(--text);
}

.btn--ghost {
  color: var(--text-muted);
}

/* Destructive actions stay soft: a pink fill with red text, never a solid red slab. */
.btn--danger,
.btn--danger-soft {
  background: var(--danger-subtle);
  color: var(--danger-text);
}

@media (hover: hover) {
  .btn--primary:hover {
    background: var(--accent-hover);
  }

  .btn--secondary:hover,
  .btn--soft:hover {
    background-image: linear-gradient(var(--hover), var(--hover));
  }

  .btn--ghost:hover {
    background: var(--hover);
    color: var(--text);
  }

  .btn--danger:hover,
  .btn--danger-soft:hover {
    background: var(--danger-subtle-hover);
  }
}

.btn:active {
  transform: scale(var(--press-scale));
}

.btn--ghost:active {
  background: var(--pressed);
}

.btn--secondary:active,
.btn--soft:active,
.btn--danger-soft:active {
  background-image: linear-gradient(var(--pressed), var(--pressed));
}

.btn:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring);
}

.btn:disabled,
.btn[aria-disabled='true'] {
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
  pointer-events: none;
}

/* A primary action that is not ready yet turns into a quiet grey pill instead of faded ink. */
.btn--primary:disabled:not([aria-busy]) {
  background: var(--surface-2);
  color: var(--text-faint);
  opacity: 1;
}

.btn[aria-busy='true'] {
  cursor: progress;
  pointer-events: none;
}

/* ─── Spinner ──────────────────────────────────────────────────────────────── */
.btn__spinner {
  flex: 0 0 auto;
  width: var(--icon-size);
  height: var(--icon-size);
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* Touch targets stay ≥ 44px on phones. */
@media (max-width: 640px) and (pointer: coarse) {
  .btn--sm {
    min-height: var(--control-md);
  }

  .btn--icon-only.btn--sm {
    width: var(--control-md);
  }
}
</style>

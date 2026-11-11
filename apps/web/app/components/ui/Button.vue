<script setup lang="ts">
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

/**
 * One button family: three looks, two sizes (docs/design-system.md §7). Monochrome — colour means a person,
 * never an action; a coloured context (a poster) re-points the fills through tokens and the same looks come out
 * inverted.
 *   primary    ink fill — the one main action of a screen or card
 *   secondary  neutral fill — everything else (the default)
 *   (icon      a round neutral fill — UiIconButton)
 *   link       inline text inside copy, not a button
 * sm 36 · md 44 on a phone, 36 on desktop · lg 44 everywhere — only the one call to action of a whole screen
 * (the landing), where a 36 pill under display type reads as an afterthought.
 * On a poster (`[data-poster]`, `[data-on-poster]`) the same looks come out inverted through the `--btn-*` tokens.
 * There is no danger button: a destructive confirm is primary, a destructive menu row has red text.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: ButtonSize
    icon?: Component | null
    loading?: boolean
    disabled?: boolean
    block?: boolean
    to?: RouteLocationRaw
  }>(),
  { variant: 'secondary', size: 'md', icon: null, loading: false, disabled: false, block: false, to: '' },
)

const attrs = useAttrs()
const classes = computed(() => ['btn', `btn--${props.variant}`, `btn--${props.size}`, { 'btn--block': props.block }])
</script>

<template>
  <NuxtLink v-if="to" v-bind="attrs" :to="to" :class="classes" :aria-busy="loading || undefined">
    <span v-if="loading" class="spinner" aria-hidden="true" />
    <component :is="icon" v-else-if="icon" aria-hidden="true" />
    <slot v-else name="icon" />
    <slot />
  </NuxtLink>
  <button
    v-else
    type="button"
    v-bind="attrs"
    :class="classes"
    :disabled="disabled || loading"
    :aria-busy="loading || undefined"
  >
    <span v-if="loading" class="spinner" aria-hidden="true" />
    <component :is="icon" v-else-if="icon" aria-hidden="true" />
    <slot v-else name="icon" />
    <slot />
  </button>
</template>

<style scoped>
.btn {
  position: relative;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-width: 0;
  max-width: 100%;
  height: var(--control-md);
  padding: 0 var(--space-4);
  border-radius: var(--radius-pill);
  font: var(--text-label);
  text-align: center;
  white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--duration-press) var(--ease-standard);
}

.btn--sm {
  gap: var(--space-1);
  height: var(--control-sm);
  padding: 0 var(--space-3);
  --icon-size: var(--icon-sm);
}

/* Compact controls still answer a 44 px tap. */
.btn--sm::after {
  content: '';
  position: absolute;
  inset: calc((var(--control-sm) - var(--hit-min)) / 2) 0;
}

@media (min-width: 901px) {
  .btn--md {
    height: var(--control-sm);
  }

  .btn--lg {
    padding: 0 var(--space-6);
  }
}

.btn--block {
  width: 100%;
}

.btn--primary {
  background: var(--btn-ink, var(--accent));
  color: var(--btn-ink-text, var(--on-accent));
}

.btn--secondary {
  background: var(--btn-fill, var(--fill-control));
  color: var(--btn-fill-text, var(--text));
}

.btn.btn--link {
  height: auto;
  padding: 0;
  border-radius: var(--radius-well);
  font: inherit;
  text-decoration: underline;
  text-decoration-color: var(--border-strong);
  text-underline-offset: 3px;
}

@media (hover: hover) and (pointer: fine) {
  .btn--primary:hover {
    background: var(--btn-ink-hover, var(--accent-hover));
  }

  .btn--secondary:hover {
    background-image: linear-gradient(var(--hover), var(--hover));
  }

  .btn--link:hover {
    text-decoration-color: currentColor;
  }
}

.btn:active:not(:disabled, .btn--link) {
  transform: scale(var(--press-scale));
}

.btn:disabled:not([aria-busy='true']) {
  opacity: var(--opacity-disabled);
}

/*
 * An unavailable main action is not a faded ink pill (white on grey reads as broken): it is the neutral
 * look, faded, and turns ink the moment it can be pressed.
 */
.btn--primary:disabled:not([aria-busy='true']) {
  background: var(--btn-fill, var(--fill-control));
  color: var(--btn-fill-text, var(--text));
}

/* A loading button keeps its colour: it is busy, not unavailable. */
.btn[aria-busy='true'] {
  opacity: 1;
  cursor: progress;
}
</style>

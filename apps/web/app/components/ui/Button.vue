<script setup lang="ts">
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

/**
 * One button family (docs/design/portrait-v3). Monochrome: colour means a person, never an action.
 *   primary   ink — one per screen
 *   secondary a hairline ring — the default
 *   tinted    a grey fill — quiet actions in tiles («Все чаты», «Сбросить поиск»)
 *   plain     text only — «Отменить», «Открыть»
 *   danger    red on a soft red fill — only what destroys
 *   poster / poster-soft  on a person's poster: ink, or a translucent chip
 *   link      inline, underlined, takes the surrounding type
 */
export type ButtonVariant = 'primary' | 'secondary' | 'tinted' | 'plain' | 'danger' | 'poster' | 'poster-soft' | 'link'
/** sm 36 everywhere (rows, filters) · md 44 on a phone, 36 on desktop · lg 44 everywhere (the one action of a card). */
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
  border-radius: var(--radius-full);
  color: var(--text);
  font: var(--text-ui);
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
  font: var(--text-small-strong);
  --icon-size: var(--icon-sm);
}

.btn--lg {
  padding: 0 var(--space-6);
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
}

.btn--block {
  width: 100%;
}

.btn--primary {
  background: var(--accent);
  color: var(--on-accent);
}

.btn--secondary {
  background: var(--btn-secondary-bg, var(--surface));
  box-shadow: var(--ring-strong);
}

.btn--tinted {
  background: var(--btn-tinted-bg, var(--surface-2));
}

.btn--plain {
  padding: 0 var(--space-2);
}

.btn--danger {
  background: var(--danger-subtle);
  color: var(--danger);
}

.btn--poster {
  background: var(--on-poster);
  color: var(--poster);
}

.btn--poster-soft {
  background: var(--on-poster-chip);
  color: var(--on-poster);
}

.btn.btn--link {
  height: auto;
  padding: 0;
  border-radius: var(--radius-mark);
  font: inherit;
  font-weight: 500;
  text-decoration: underline;
  text-decoration-color: var(--border-strong);
  text-underline-offset: 3px;
}

@media (hover: hover) and (pointer: fine) {
  .btn--primary:hover {
    background: var(--accent-hover);
  }

  .btn--secondary:hover,
  .btn--plain:hover,
  .btn--tinted:hover {
    background-image: linear-gradient(var(--hover), var(--hover));
  }

  .btn--link:hover {
    text-decoration-color: currentColor;
  }
}

.btn:active:not(:disabled, .btn--link) {
  transform: scale(var(--press-scale));
}

.btn:disabled {
  opacity: var(--opacity-disabled);
}

/* A loading button keeps its colour: it is busy, not unavailable. */
.btn[aria-busy='true'] {
  opacity: 1;
  cursor: progress;
}
</style>

<script setup lang="ts">
import type { Component } from 'vue'
import Tooltip from './Tooltip.vue'

/**
 * The round icon button: the third of the three button looks (docs/design-system.md §7), a neutral fill. A
 * coloured context (a poster) re-points the fill through tokens; the look does not change.
 * Sizes follow the buttons: sm 36 · md 44 on a phone, 36 on desktop.
 * `plain` — no fill, a quiet icon: only for a card's own «⋯» menu, where a filled circle would outweigh the
 * card's name (docs/design-system.md, «Кит»). Its hover and press are the same fill as everywhere.
 * `bare` — no fill, the ink of the text: only the bell, a status rather than an action (13.11: every other icon in
 * a header, a sheet or a dialog stands on a grey circle — «назад», «поделиться», «⋯», «закрыть»).
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Required: the accessible name and the desktop tooltip. */
    label: string
    icon: Component
    size?: 'sm' | 'md'
    to?: string
    loading?: boolean
    disabled?: boolean
    noTooltip?: boolean
    plain?: boolean
    bare?: boolean
  }>(),
  { size: 'md', to: '', loading: false, disabled: false, noTooltip: false, plain: false, bare: false },
)

const attrs = useAttrs()
// attrs are not reactive: layout classes go on the wrapper, the rest (aria-*, handlers) on the button.
function buttonAttrs() {
  return Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== 'class' && key !== 'style'))
}
const classes = computed(() => [
  'icon-btn',
  `icon-btn--${props.size}`,
  { 'icon-btn--plain': props.plain, 'icon-btn--bare': props.bare },
])
</script>

<template>
  <Tooltip :class="attrs.class" :style="attrs.style" :text="label" :describe="false" :disabled="noTooltip">
    <NuxtLink v-if="to" v-bind="buttonAttrs()" :to="to" :class="classes" :aria-label="label">
      <component :is="icon" aria-hidden="true" />
    </NuxtLink>
    <button
      v-else
      type="button"
      v-bind="buttonAttrs()"
      :class="classes"
      :aria-label="label"
      :disabled="disabled || loading"
      :aria-busy="loading || undefined"
    >
      <span v-if="loading" class="spinner" aria-hidden="true" />
      <component :is="icon" v-else aria-hidden="true" />
    </button>
  </Tooltip>
</template>

<style scoped>
.icon-btn {
  position: relative;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: var(--control-md);
  height: var(--control-md);
  border-radius: var(--radius-pill);
  /* A grey circle on the page, in a sheet and on the glass bar; over a poster a translucent chip. */
  background: var(--btn-fill, var(--fill-raised));
  color: var(--btn-fill-text, var(--text));
  -webkit-backdrop-filter: var(--btn-blur, none);
  backdrop-filter: var(--btn-blur, none);
  isolation: isolate;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color var(--transition-fast),
    transform var(--duration-press) var(--ease-standard);
}

.icon-btn--sm {
  width: var(--control-sm);
  height: var(--control-sm);
}

@media (min-width: 901px) {
  .icon-btn--md {
    width: var(--control-sm);
    height: var(--control-sm);
  }
}

/* On a poster (a report tile) the glyph is the poster's ink: --btn-plain-text. */
.icon-btn--plain {
  background: transparent;
  color: var(--btn-plain-text, var(--text-muted));
}

.icon-btn--plain[aria-expanded='true'] {
  background: var(--pressed);
  color: var(--btn-plain-text, var(--text));
}

.icon-btn--bare {
  background: transparent;
}

/* The state layer: a tinted overlay under the glyph, faded with opacity (a background-image cannot be transitioned). */
.icon-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  border-radius: inherit;
  background: var(--hover);
  opacity: 0;
  pointer-events: none;
  transition:
    opacity var(--transition-fast),
    background-color var(--transition-fast);
}

/* Compact circles still answer a 44 px tap. */
.icon-btn::after {
  content: '';
  position: absolute;
  inset: min(0px, calc((100% - var(--hit-min)) / 2));
}

@media (hover: hover) and (pointer: fine) {
  .icon-btn:hover:not(:disabled)::before {
    opacity: 1;
  }
}

.icon-btn:active:not(:disabled)::before {
  background: var(--pressed);
  opacity: 1;
}

.icon-btn:active:not(:disabled) {
  transform: scale(var(--press-scale));
}

.icon-btn:disabled:not([aria-busy]) {
  opacity: var(--opacity-disabled);
}
</style>

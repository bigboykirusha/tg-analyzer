<script setup lang="ts">
import type { Component } from 'vue'
import Tooltip from './Tooltip.vue'

/**
 * The round icon button: the third of the three button looks (docs/design-system.md §7), a neutral fill. A
 * coloured context (a poster) re-points the fill through tokens; the look does not change.
 * Sizes follow the buttons: sm 36 · md 44 on a phone, 36 on desktop.
 *
 * Deprecated `tone` aliases, all the same look: `chrome` (header circles; the class stays so the headers can
 * restyle it over a poster), `poster` (inverted for the poster), `plain`, `fill`. Size `lg` = md.
 */
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Required: the accessible name and the desktop tooltip. */
    label: string
    icon: Component
    tone?: 'fill' | 'chrome' | 'poster' | 'plain'
    size?: 'sm' | 'md' | 'lg'
    to?: string
    loading?: boolean
    disabled?: boolean
    noTooltip?: boolean
  }>(),
  { tone: 'fill', size: 'md', to: '', loading: false, disabled: false, noTooltip: false },
)

const attrs = useAttrs()
// attrs are not reactive: layout classes go on the wrapper, the rest (aria-*, handlers) on the button.
function buttonAttrs() {
  return Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== 'class' && key !== 'style'))
}
const classes = computed(() => [
  'icon-btn',
  `icon-btn--${props.tone}`,
  `icon-btn--${props.size === 'sm' ? 'sm' : 'md'}`,
])
const onPoster = computed(() => props.tone === 'poster')
</script>

<template>
  <Tooltip :class="attrs.class" :style="attrs.style" :text="label" :describe="false" :disabled="noTooltip">
    <NuxtLink
      v-if="to"
      v-bind="buttonAttrs()"
      :to="to"
      :class="classes"
      :data-on-poster="onPoster || undefined"
      :aria-label="label"
    >
      <component :is="icon" aria-hidden="true" />
    </NuxtLink>
    <button
      v-else
      type="button"
      v-bind="buttonAttrs()"
      :class="classes"
      :data-on-poster="onPoster || undefined"
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
  background: var(--btn-fill, var(--surface-2));
  color: var(--btn-fill-text, var(--text));
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

/* Compact circles still answer a 44 px tap. */
.icon-btn::after {
  content: '';
  position: absolute;
  inset: min(0px, calc((100% - var(--hit-min)) / 2));
}

@media (hover: hover) and (pointer: fine) {
  .icon-btn:hover:not(:disabled) {
    background-image: linear-gradient(var(--hover), var(--hover));
  }
}

.icon-btn:active:not(:disabled) {
  transform: scale(var(--press-scale));
}

.icon-btn:disabled:not([aria-busy]) {
  opacity: var(--opacity-disabled);
}
</style>

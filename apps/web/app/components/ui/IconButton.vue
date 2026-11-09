<script setup lang="ts">
import type { Component } from 'vue'
import Tooltip from './Tooltip.vue'

/**
 * A round icon button. Tones:
 *   fill   a grey well (inside cards; inside sheets the raised fill) — the default
 *   chrome floats over content (header circles on a phone): raised surface, hairline ring, soft shadow
 *   poster on a person's poster: a translucent chip
 *   plain  no fill (desktop toolbars)
 * Sizes follow the buttons: sm 36 · md 44 on a phone, 36 on desktop · lg 44.
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
const classes = computed(() => ['icon-btn', `icon-btn--${props.tone}`, `icon-btn--${props.size}`])
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
  border-radius: var(--radius-full);
  color: var(--text);
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

.icon-btn--fill {
  background: var(--icon-btn-fill, var(--surface-2));
}

.icon-btn--chrome {
  background: var(--surface-raised);
  box-shadow: var(--shadow-chrome);
}

.icon-btn--poster {
  background: var(--on-poster-chip);
  color: var(--on-poster);
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

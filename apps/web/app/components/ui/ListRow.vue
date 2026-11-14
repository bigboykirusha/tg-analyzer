<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

/**
 * One row of a list (inside UiGroup): a leading avatar or icon, a title with an optional second line,
 * a trailing value or action, an optional chevron. 56 tall with one line; with a second line 12 above and below, so
 * the text keeps air against the hairline as a one-line row does (16 around 24). The hairline under the row belongs to its
 * body, so it starts where the text starts — as in iOS lists — and the last row has none.
 *
 * Renders a NuxtLink with `to`, an <a> with `href`, a <button> with `as="button"`, otherwise `as`.
 * Links and buttons are interactive: a soft fill under the pointer and on press.
 */
const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    as?: string
    to?: RouteLocationRaw
    href?: string
    /** A chevron at the end: the row opens something. */
    chevron?: boolean
    /** The second line wraps instead of being cut (privacy). */
    wrap?: boolean
    interactive?: boolean
    danger?: boolean
    disabled?: boolean
    /** The row whose details are open beside the list: it keeps the fill. */
    selected?: boolean
  }>(),
  {
    title: '',
    subtitle: '',
    as: 'div',
    to: '',
    href: '',
    chevron: false,
    wrap: false,
    interactive: undefined,
    danger: false,
    disabled: false,
    selected: false,
  },
)

const NuxtLink = resolveComponent('NuxtLink')
const tag = computed(() => (props.to ? NuxtLink : props.href ? 'a' : props.as))
const isButton = computed(() => !props.to && !props.href && props.as === 'button')
const isInteractive = computed(() => props.interactive ?? Boolean(props.to || props.href || isButton.value))
const tagAttrs = computed(() => {
  if (props.to) return { to: props.to, 'aria-disabled': props.disabled || undefined }
  if (props.href) return { href: props.href, 'aria-disabled': props.disabled || undefined }
  if (isButton.value) return { type: 'button', disabled: props.disabled }
  return {}
})
</script>

<template>
  <component
    :is="tag"
    v-bind="tagAttrs"
    class="list-row"
    :class="{
      'list-row--interactive': isInteractive,
      'list-row--danger': danger,
      'list-row--wrap': wrap,
      'list-row--disabled': disabled,
      'list-row--selected': selected,
      'list-row--two': subtitle || $slots.subtitle,
    }"
  >
    <span v-if="$slots.leading" class="list-row__leading"><slot name="leading" /></span>
    <span class="list-row__body">
      <span class="list-row__copy">
        <span class="list-row__title"
          ><slot>{{ title }}</slot></span
        >
        <span v-if="subtitle || $slots.subtitle" class="list-row__subtitle">
          <slot name="subtitle">{{ subtitle }}</slot>
        </span>
      </span>
      <span v-if="$slots.trailing" class="list-row__trailing"><slot name="trailing" /></span>
      <svg
        v-if="chevron"
        class="list-row__chevron"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </span>
  </component>
</template>

<style scoped>
.list-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-width: 0;
  /* In a group the row runs edge to edge and its text starts at the card's padding (UiGroup). */
  padding-inline-start: var(--row-inset, 0px);
  color: var(--text);
  text-align: left;
  -webkit-tap-highlight-color: transparent;
}

/* Content paints above the hover fill. */
.list-row > * {
  position: relative;
}

.list-row__leading {
  display: inline-flex;
  flex: none;
  align-items: center;
  color: var(--text);
}

.list-row__body {
  display: flex;
  flex: 1;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  min-height: var(--row-height);
  /* The hairline runs from the text to the same inset on the other side (14.11, S2): a margin, not a padding, ends it
     there; the trailing control stays where it was. */
  margin-right: var(--row-inset, 0px);
  padding: var(--space-1) 0;
  box-shadow: var(--divider-bottom);
}

.list-row__copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.list-row__title {
  overflow: hidden;
  font: var(--text-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-row__subtitle {
  overflow: hidden;
  color: var(--text-muted);
  font: var(--text-label);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Two lines: 12 above and below instead of the one-line row's centring in 56. */
.list-row--two > .list-row__body {
  padding-block: var(--space-3);
}

/* Long second lines (privacy): wrap, 12 above and below, the icon at the first line. */
.list-row--wrap {
  align-items: flex-start;
}

.list-row--wrap > .list-row__leading {
  padding-top: var(--space-3);
}

.list-row--wrap > .list-row__body {
  padding: var(--space-3) 0;
}

.list-row--wrap .list-row__copy {
  gap: var(--space-0-5);
}

.list-row--wrap .list-row__title,
.list-row--wrap .list-row__subtitle {
  white-space: normal;
}

.list-row__trailing {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-muted);
  font: var(--text-body);
}

.list-row__chevron {
  flex: none;
  width: var(--icon-sm);
  height: var(--icon-sm);
  color: var(--text-faint);
}

.list-row--danger,
.list-row--danger .list-row__leading {
  color: var(--danger);
}

/* In a group the fill is the whole row (UiGroup sets the inset and the corners); a row on its own, in a report
   card, gets a soft rounded fill a little past its text. */
.list-row--interactive {
  cursor: pointer;
  user-select: none;
}

.list-row--interactive::before {
  content: '';
  position: absolute;
  inset: var(--row-fill-inset, var(--space-0-5) calc(-1 * var(--space-3)));
  border-radius: var(--row-fill-radius, var(--radius-well));
  background: transparent;
  pointer-events: none;
  transition: background-color var(--transition-fast);
}

@media (hover: hover) and (pointer: fine) {
  .list-row--interactive:hover::before {
    background: var(--hover);
  }
}

.list-row--interactive:active::before,
.list-row--selected::before {
  background: var(--pressed);
}

.list-row--interactive:focus-visible {
  outline: none;
}

.list-row--interactive:focus-visible::before {
  box-shadow: var(--ring-selected);
}

.list-row--disabled {
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
}
</style>

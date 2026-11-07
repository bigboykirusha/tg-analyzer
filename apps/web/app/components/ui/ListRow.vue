<script setup lang="ts">
/**
 * One row of any list: a leading slot (avatar, icon tile, flag), a title with an optional subtitle,
 * and a trailing slot (meta, badge, check, action). Menus, select options, chat lists, settings and
 * share actions are all this row at one of three heights.
 *
 *   sm 44 — menu items and options (title in --text-ui)
 *   md 56 — settings and action rows (title in --text-title)
 *   lg 68 — people and chats with a subtitle (title in --text-title)
 *
 * Renders a NuxtLink with `to`, an <a> with `href`, a <button> with `as="button"`, otherwise `as`
 * (a div by default; pass role/aria through attrs, e.g. role="option"). Links and buttons are
 * interactive by default: hover fill, press fill and an inset ring on keyboard focus.
 *
 * Knobs for the parent: `--row-px` (inline padding, 12 by default) and `--row-radius` (16; a list
 * of rows split by dividers inside a card usually sets 0).
 */
const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    size?: 'sm' | 'md' | 'lg'
    as?: string
    to?: string
    href?: string
    /** A hairline above the row (--divider-top); put it on every row but the first. */
    divider?: boolean
    /** Hover and press fills; on by default for links and buttons. */
    interactive?: boolean
    danger?: boolean
    disabled?: boolean
  }>(),
  {
    title: '',
    subtitle: '',
    size: 'sm',
    as: 'div',
    to: '',
    href: '',
    divider: false,
    interactive: undefined,
    danger: false,
    disabled: false,
  },
)

const NuxtLink = resolveComponent('NuxtLink')

const tag = computed(() => {
  if (props.to) return NuxtLink
  if (props.href) return 'a'
  return props.as
})
const isButton = computed(() => !props.to && !props.href && props.as === 'button')
const isInteractive = computed(() => props.interactive ?? Boolean(props.to || props.href || isButton.value))
const tagAttrs = computed(() => {
  if (props.to) return { to: props.to, 'aria-disabled': props.disabled || undefined }
  if (props.href) return { href: props.href, 'aria-disabled': props.disabled || undefined }
  if (isButton.value) return { type: 'button', disabled: props.disabled }
  return { 'aria-disabled': props.disabled || undefined }
})
</script>

<template>
  <component
    :is="tag"
    v-bind="tagAttrs"
    class="list-row"
    :class="[
      `list-row--${size}`,
      {
        'list-row--interactive': isInteractive,
        'list-row--divider': divider,
        'list-row--danger': danger,
        'list-row--disabled': disabled,
      },
    ]"
  >
    <span v-if="$slots.leading" class="list-row__leading"><slot name="leading" /></span>
    <span class="list-row__copy">
      <span class="list-row__title"
        ><slot>{{ title }}</slot></span
      >
      <span v-if="subtitle || $slots.subtitle" class="list-row__subtitle">
        <slot name="subtitle">{{ subtitle }}</slot>
      </span>
    </span>
    <span v-if="$slots.trailing" class="list-row__trailing"><slot name="trailing" /></span>
  </component>
</template>

<style scoped>
.list-row {
  /* 44 / 56 / 68: the md and lg heights want tokens of their own (--row-md, --row-lg). */
  --row-height: var(--control-md);
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-width: 0;
  min-height: var(--row-height);
  padding: var(--space-1) var(--row-px, var(--space-3));
  border: 0;
  border-radius: var(--row-radius, var(--radius-md));
  background: transparent;
  color: var(--text);
  font: var(--text-ui);
  text-align: left;
  text-decoration: none;
  transition:
    background-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.list-row--md {
  --row-height: calc(var(--control-md) + var(--space-3));
  padding-block: var(--space-2);
  font: var(--text-title);
}

.list-row--lg {
  --row-height: calc(var(--control-md) + var(--space-6));
  padding-block: var(--space-3);
  font: var(--text-title);
}

/*
 * The divider is a hairline inset to the row's content, drawn on its own layer so the row keeps
 * its round hover fill. It fades while this row or the one above is under the pointer.
 */
.list-row--divider::before {
  content: '';
  position: absolute;
  top: 0;
  right: var(--row-px, var(--space-3));
  left: var(--row-px, var(--space-3));
  height: 1px;
  box-shadow: var(--divider-top);
  pointer-events: none;
  transition: opacity var(--transition-fast);
}

.list-row--interactive:focus-visible::before,
.list-row--interactive:focus-visible + .list-row--divider::before {
  opacity: 0;
}

.list-row__leading,
.list-row__trailing {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: var(--space-2);
}

.list-row__trailing {
  color: var(--text-muted);
  font: var(--text-small);
}

.list-row__copy {
  display: grid;
  flex: 1 1 auto;
  gap: var(--space-0-5);
  min-width: 0;
}

.list-row__title,
.list-row__subtitle {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.list-row__subtitle {
  color: var(--text-muted);
  font: var(--text-small);
}

/* ─── Interactive ───────────────────────────────────────────────────────── */
.list-row--interactive {
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

@media (hover: hover) and (pointer: fine) {
  .list-row--interactive:hover {
    background: var(--hover);
  }

  .list-row--danger.list-row--interactive:hover {
    background: var(--danger-subtle);
  }

  .list-row--interactive:hover::before,
  .list-row--interactive:hover + .list-row--divider::before {
    opacity: 0;
  }
}

.list-row--interactive:active {
  background: var(--pressed);
}

.list-row--interactive:focus-visible {
  outline: none;
  background: var(--hover);
  box-shadow: var(--ring-selected);
}

/* ─── Tones and states ──────────────────────────────────────────────────── */
.list-row--danger {
  color: var(--danger);
}

.list-row--danger :deep(svg.row-icon) {
  background: var(--danger-subtle);
  color: var(--danger);
}

.list-row--disabled,
.list-row:disabled {
  background: transparent;
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
}
</style>

<script setup lang="ts">
import type { Component } from 'vue'

/**
 * One action in a menu: an optional 20 px icon, the label, an optional hint under it or a value at the
 * end. 44 tall in a popover; in a phone sheet it becomes a list row with a hairline from the text.
 * A destructive item comes last, after a divider.
 */
defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    icon?: Component | null
    hint?: string | null
    /** The current value, quiet at the end («Русский»). */
    meta?: string | null
    danger?: boolean
    disabled?: boolean
    selected?: boolean
  }>(),
  { icon: null, hint: null, meta: null, danger: false, disabled: false, selected: false },
)
</script>

<template>
  <button
    type="button"
    v-bind="$attrs"
    class="menu-item"
    :class="{ 'menu-item--danger': danger, 'menu-item--selected': selected }"
    :disabled="disabled"
    :aria-disabled="disabled || undefined"
  >
    <component :is="icon" v-if="icon" class="menu-item__icon" aria-hidden="true" />
    <span class="menu-item__body">
      <span class="menu-item__copy">
        <span class="menu-item__label"><slot /></span>
        <span v-if="hint" class="menu-item__hint">{{ hint }}</span>
      </span>
      <span v-if="meta" class="menu-item__meta">{{ meta }}</span>
      <slot name="trailing" />
    </span>
  </button>
</template>

<style scoped>
.menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: var(--control-md);
  padding: 0 var(--space-3);
  border-radius: var(--radius-well);
  color: var(--text);
  font: var(--text-label);
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  transition: background-color var(--transition-fast);
}

.menu-item__icon {
  color: var(--text-muted);
}

.menu-item__body {
  display: flex;
  flex: 1;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  min-height: inherit;
}

.menu-item__copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.menu-item__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-item__hint,
.menu-item__meta {
  color: var(--text-muted);
  font: var(--text-label);
}

.menu-item--danger,
.menu-item--danger .menu-item__icon {
  color: var(--danger);
}

.menu-item--selected {
  background: var(--sidebar-selection);
}

@media (hover: hover) and (pointer: fine) {
  .menu-item:hover:not(:disabled) {
    background: var(--hover);
  }
}

.menu-item:active:not(:disabled) {
  background: var(--pressed);
}

.menu-item:focus-visible {
  outline: none;
  background: var(--hover);
  box-shadow: var(--ring-selected);
}

.menu-item:disabled {
  opacity: var(--opacity-disabled);
}
</style>

<script setup lang="ts">
import type { Component } from 'vue'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    icon?: Component | null
    /** Current value, shown muted on the right. */
    meta?: string | null
    /** Destructive item: last, after a divider; end the label with «…» if a confirmation follows. */
    danger?: boolean
    disabled?: boolean
  }>(),
  {
    icon: null,
    meta: null,
    danger: false,
    disabled: false,
  },
)
</script>

<template>
  <button
    v-bind="$attrs"
    type="button"
    class="menu-item"
    :class="{ 'menu-item--danger': danger }"
    :disabled="disabled"
    :aria-disabled="disabled || undefined"
  >
    <component :is="icon" v-if="icon" class="menu-item__icon" aria-hidden="true" />
    <span class="menu-item__label"><slot /></span>
    <span v-if="meta" class="menu-item__meta">{{ meta }}</span>
  </button>
</template>

<style scoped>
.menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 40px;
  padding: 0 var(--space-3);
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font: var(--text-ui);
  text-align: left;
  transition: background-color var(--transition-fast);
}

.menu-item__icon {
  color: var(--text-muted);
}

.menu-item__label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-item__meta {
  color: var(--text-muted);
  font: var(--text-small);
}

@media (hover: hover) {
  .menu-item:hover {
    background: var(--hover);
  }
}

.menu-item:active {
  background: var(--pressed);
}

.menu-item:focus-visible {
  outline: none;
  background: var(--hover);
  box-shadow: inset 0 0 0 2px var(--accent);
}

.menu-item--danger,
.menu-item--danger .menu-item__icon {
  color: var(--danger);
}

@media (hover: hover) {
  .menu-item--danger:hover {
    background: var(--danger-subtle);
  }
}

.menu-item:disabled {
  background: transparent;
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
}
</style>

<script setup lang="ts">
import type { Component } from 'vue'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    icon?: Component | null
    danger?: boolean
    disabled?: boolean
  }>(),
  {
    icon: null,
    danger: false,
    disabled: false,
  },
)
</script>

<template>
  <button v-bind="$attrs" type="button" class="menu-item" :class="{ 'menu-item--danger': danger }" :disabled="disabled">
    <span v-if="icon" class="menu-item__icon" aria-hidden="true"><component :is="icon" /></span>
    <span class="menu-item__label"><slot /></span>
  </button>
</template>

<style scoped>
.menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 44px;
  padding: var(--space-2) var(--space-3);
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 550;
  line-height: 1.3;
  text-align: left;
  transition:
    background var(--transition-fast),
    color var(--transition-fast),
    transform var(--transition-fast);
}

.menu-item__icon {
  display: inline-flex;
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
}

.menu-item__icon :deep(svg) {
  width: 100%;
  height: 100%;
  stroke-width: 1.6;
}

.menu-item__label {
  min-width: 0;
  overflow-wrap: anywhere;
}

.menu-item:hover:not(:disabled) {
  background: var(--surface-2);
}

.menu-item:active:not(:disabled) {
  transform: scale(0.985);
}

.menu-item:focus-visible {
  outline: none;
  background: var(--accent-subtle);
  box-shadow: inset 0 0 0 1px var(--accent-border);
  color: var(--accent);
}

.menu-item--danger {
  color: var(--danger);
}

.menu-item--danger:hover:not(:disabled),
.menu-item--danger:focus-visible {
  background: var(--danger-subtle);
  color: var(--danger);
}

.menu-item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>

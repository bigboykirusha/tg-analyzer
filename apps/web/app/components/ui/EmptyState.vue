<script setup lang="ts">
import type { Component } from 'vue'
import { MessageSquare } from '../../lib/icons'

/**
 * Nothing here yet, or something failed: a bare 32 px symbol (no grey disc), the title, one line on
 * what to do next, the action. Left-aligned, like the rest of the page.
 */
withDefaults(
  defineProps<{
    title: string
    description?: string | null
    icon?: Component | null
    tone?: 'neutral' | 'danger'
    /** Inside a card or a sheet: a smaller title. */
    compact?: boolean
  }>(),
  { description: null, icon: null, tone: 'neutral', compact: false },
)
</script>

<template>
  <div class="empty" :class="{ 'empty--compact': compact, 'empty--danger': tone === 'danger' }">
    <span class="empty__icon" aria-hidden="true">
      <slot name="icon"><component :is="icon ?? MessageSquare" /></slot>
    </span>
    <h2 class="empty__title">{{ title }}</h2>
    <p v-if="description" class="empty__text">{{ description }}</p>
    <div v-if="$slots.action" class="empty__action"><slot name="action" /></div>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-3);
  max-width: var(--measure);
}

.empty__icon {
  display: flex;
  color: var(--text-muted);
}

.empty__icon :deep(svg) {
  --icon-size: var(--icon-xl);
  stroke-width: 1.5;
}

.empty--danger .empty__icon {
  color: var(--danger);
}

.empty__title {
  font: var(--text-h1);
  letter-spacing: var(--tracking-h1);
}

.empty--compact .empty__title {
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
}

.empty__text {
  color: var(--text-muted);
  font: var(--text-body);
}

.empty--compact .empty__text {
  font: var(--text-label);
}

.empty__action {
  margin-top: var(--space-2);
}
</style>

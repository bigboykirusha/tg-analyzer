<script setup lang="ts">
import type { Component } from 'vue'
import { MessageSquare } from '../../lib/icons'

withDefaults(
  defineProps<{
    /** What is empty. */
    title: string
    /** How to fix it. */
    description?: string | null
    icon?: Component | null
    /** `danger` for a failed load. */
    tone?: 'neutral' | 'danger'
    compact?: boolean
  }>(),
  { description: null, icon: null, tone: 'neutral', compact: false },
)
</script>

<template>
  <div class="empty-state" :class="{ 'empty-state--compact': compact }">
    <span class="icon-tile icon-tile--lg" :class="{ 'icon-tile--danger': tone === 'danger' }" aria-hidden="true">
      <slot name="icon">
        <component :is="icon ?? MessageSquare" />
      </slot>
    </span>
    <div class="empty-copy">
      <h3 class="empty-title t-title">{{ title }}</h3>
      <p v-if="description" class="empty-text">{{ description }}</p>
    </div>
    <div v-if="$slots.action" class="empty-action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: grid;
  justify-items: center;
  gap: var(--space-4);
  padding: var(--space-10) var(--space-5);
  text-align: center;
}

.empty-state--compact {
  padding-block: var(--space-6);
}

.empty-copy {
  display: grid;
  gap: var(--space-1);
  max-width: 360px;
}

.empty-title {
  color: var(--text);
}

.empty-text {
  color: var(--text-muted);
  font: var(--text-ui);
  font-weight: 400;
}

.empty-action {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2);
  margin-top: var(--space-1);
}
</style>

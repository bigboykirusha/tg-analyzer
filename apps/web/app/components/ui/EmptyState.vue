<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  title: string
  description?: string | null
  icon?: Component | null
}>()
</script>

<template>
  <div class="empty-state">
    <div class="empty-icon">
      <component :is="icon" v-if="icon" />
      <slot name="icon">
        <svg v-if="!icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M5 7.75A2.75 2.75 0 0 1 7.75 5h8.5A2.75 2.75 0 0 1 19 7.75v8.5A2.75 2.75 0 0 1 16.25 19h-8.5A2.75 2.75 0 0 1 5 16.25zM8.5 9.5h7m-7 5h4"
          />
        </svg>
      </slot>
    </div>
    <div class="empty-copy">
      <h3 class="empty-title">{{ title }}</h3>
      <p v-if="description" class="t-small">{{ description }}</p>
    </div>
    <div v-if="$slots.action" class="empty-action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  text-align: center;
  padding: var(--space-8) var(--space-5);
  border-radius: var(--radius-lg);
  background: transparent;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  color: var(--text-muted);
}

.empty-icon :deep(svg),
.empty-icon svg {
  width: 24px;
  height: 24px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.empty-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.empty-title {
  color: var(--text-muted);
  font-size: 1.0625rem;
  font-weight: 600;
  line-height: 1.4;
}

.empty-copy p {
  color: var(--text-muted);
  max-width: 480px;
}

.empty-action {
  margin-top: var(--space-1);
}
</style>

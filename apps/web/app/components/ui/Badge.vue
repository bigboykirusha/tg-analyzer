<script setup lang="ts">
import type { Component } from 'vue'

/** Short status or type label next to a name: «Готов», «Анализ · 64%», «Группа». Not clickable. */
withDefaults(
  defineProps<{
    tone?: 'neutral' | 'accent' | 'warning' | 'danger'
    icon?: Component | null
    /** Leading 6px dot; `live` makes it pulse while a process runs. */
    dot?: boolean
    live?: boolean
  }>(),
  { tone: 'neutral', icon: null, dot: false, live: false },
)
</script>

<template>
  <span class="badge" :class="[`badge--${tone}`, { 'badge--live': live }]">
    <component :is="icon" v-if="icon" aria-hidden="true" />
    <span v-else-if="dot || live" class="badge__dot" aria-hidden="true" />
    <slot />
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: var(--space-1);
  height: 22px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-full);
  background: var(--surface-2);
  color: var(--text-muted);
  font: var(--text-caption);
  font-weight: 600;
  white-space: nowrap;
  --icon-size: 12px;
}

.badge :deep(svg.lucide) {
  stroke-width: 2.25;
}

.badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.badge--accent {
  background: var(--accent-subtle);
  color: var(--accent-ink);
}

.badge--warning {
  background: var(--warning-subtle);
  color: var(--warning-ink);
}

.badge--danger {
  background: var(--danger-subtle);
  color: var(--danger);
}

.badge--live .badge__dot {
  animation: badge-pulse 1.6s ease-in-out infinite;
}

@keyframes badge-pulse {
  50% {
    opacity: 0.35;
  }
}

@media (prefers-reduced-motion: reduce) {
  .badge--live .badge__dot {
    animation: none;
  }
}
</style>

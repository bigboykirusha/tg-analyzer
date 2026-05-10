<script setup lang="ts">
defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <div class="empty-state">
    <div class="empty-icon">
      <slot name="icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 7.75A2.75 2.75 0 0 1 7.75 5h8.5A2.75 2.75 0 0 1 19 7.75v8.5A2.75 2.75 0 0 1 16.25 19h-8.5A2.75 2.75 0 0 1 5 16.25zM8.5 9.5h7m-7 5h4" />
        </svg>
      </slot>
    </div>
    <div class="empty-copy">
      <h3 class="text-h3">{{ title }}</h3>
      <p class="text-body-sm">{{ description }}</p>
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
  border: 1px dashed var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-full);
  background: var(--bg-overlay);
  color: var(--text-secondary);
}

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

.empty-copy p {
  color: var(--text-secondary);
  max-width: 480px;
}

.empty-action {
  margin-top: var(--space-1);
}
</style>

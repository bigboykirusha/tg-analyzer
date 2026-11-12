<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'

/**
 * A full-page state (not found, an error, offline, a link that no longer works): the title, one line on
 * what happened, the way on. Phones: the page itself, left-aligned, the action full width. Desktop: one
 * 440 card in the middle — the same anatomy as sign-in.
 */
defineProps<{
  title: string
  text: string
  action: string
  to?: RouteLocationRaw
  secondary?: string
  secondaryTo?: RouteLocationRaw
}>()
defineEmits<{ action: [] }>()
</script>

<template>
  <div class="status">
    <section class="status__card" aria-labelledby="status-title">
      <h1 id="status-title" class="status__title">{{ title }}</h1>
      <p class="status__text">{{ text }}</p>
      <div class="status__actions">
        <UiButton variant="primary" block :to="to" @click="!to && $emit('action')">{{ action }}</UiButton>
        <UiButton v-if="secondary" variant="secondary" block :to="secondaryTo">{{ secondary }}</UiButton>
      </div>
    </section>
  </div>
</template>

<style scoped>
.status {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  padding: var(--space-6) var(--page-gutter) var(--space-16);
}

.status__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
}

.status__title {
  font: var(--text-h1);
  letter-spacing: var(--tracking-h1);
  text-wrap: balance;
}

.status__text {
  color: var(--text-muted);
  font: var(--text-body);
}

.status__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-4);
}

@media (min-width: 901px) {
  .status {
    align-items: center;
    padding-block: var(--space-10);
  }

  .status__card {
    max-width: var(--card-focus);
    padding: var(--space-8);
    border-radius: var(--radius-card);
    background: var(--surface);
    box-shadow: var(--ring-card);
  }

  .status__title {
    font: var(--text-h2);
    letter-spacing: var(--tracking-h2);
  }

  .status__actions {
    margin-top: var(--space-2);
  }
}
</style>

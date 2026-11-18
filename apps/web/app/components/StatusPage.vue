<script setup lang="ts">
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

/**
 * A full-page state (not found, an error, offline, a link that no longer works). The same anatomy as every
 * «nothing to show» in the product (`UiEmptyState` full, 18.11): the symbol in a well, the title, one line on
 * what happened, the way on — centred. Phones: on the page itself. Desktop: inside one 440 card in the middle,
 * like sign-in.
 */
defineProps<{
  title: string
  text: string
  action: string
  icon?: Component | null
  tone?: 'neutral' | 'danger'
  to?: RouteLocationRaw
  secondary?: string
  secondaryTo?: RouteLocationRaw
}>()
defineEmits<{ action: [] }>()
</script>

<template>
  <div class="status">
    <section class="status__card">
      <UiEmptyState :level="1" :icon="icon" :tone="tone" :title="title" :description="text">
        <template #action>
          <div class="status__actions">
            <UiButton variant="primary" :to="to" @click="!to && $emit('action')">{{ action }}</UiButton>
            <UiButton v-if="secondary" variant="secondary" :to="secondaryTo">{{ secondary }}</UiButton>
          </div>
        </template>
      </UiEmptyState>
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
  width: 100%;
}

.status__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--space-2);
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

  /* The card is the frame: no screen-high empty space inside it. */
  .status__card :deep(.empty--full) {
    min-height: 0;
    padding-block: 0;
  }
}
</style>

<script setup lang="ts">
/**
 * A report card: one title, an optional plain-language explanation, then the content.
 * `tone` turns it into an ink, lime or grey tile: the accents that break up a page of white cards.
 */
defineProps<{ title: string; text?: string; wide?: boolean; tone?: 'ink' | 'lime' | 'grey' }>()
</script>

<template>
  <article class="tile report-section" :class="[{ 'report-section--wide': wide }, tone && `tile--${tone}`]">
    <header class="report-section__head">
      <div class="report-section__copy">
        <h2 class="report-section__title">{{ title }}</h2>
        <p v-if="text" class="report-section__text">{{ text }}</p>
      </div>
      <div v-if="$slots.actions" class="report-section__actions no-print">
        <slot name="actions" />
      </div>
    </header>
    <slot />
  </article>
</template>

<style scoped>
.report-section {
  gap: var(--space-4);
  overflow: hidden;
}

.report-section--wide {
  grid-column: 1 / -1;
}

.report-section__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
}

.report-section__copy {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
  max-width: 560px;
}

/* Tiles are named quietly; the numbers inside carry the weight. */
.report-section__title {
  font: var(--text-title);
  letter-spacing: -0.01em;
}

.report-section__text {
  color: var(--text-muted);
  font: var(--text-small);
  overflow-wrap: anywhere;
}
</style>

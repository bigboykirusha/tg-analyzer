<script setup lang="ts">
/**
 * A report card, one anatomy for every card (docs/design-system.md, «Карточка отчёта»): the title
 * as a question, an optional explanation, the answer in one sentence, then the card's own picture
 * (the slot). The two sides are named inside the picture, never in a footer.
 * `tone` turns it into an ink, lime or grey tile: the accents that break up a page of white cards.
 */
defineProps<{
  title?: string
  text?: string
  answer?: string | null
  wide?: boolean
  tone?: 'ink' | 'lime' | 'grey'
}>()
</script>

<template>
  <article class="tile report-section" :class="[{ 'report-section--wide': wide }, tone && `tile--${tone}`]">
    <header v-if="title || text || $slots.actions" class="report-section__head">
      <div class="report-section__copy">
        <h3 v-if="title" class="report-section__title">{{ title }}</h3>
        <p v-if="text" class="report-section__text">{{ text }}</p>
      </div>
      <div v-if="$slots.actions" class="report-section__actions no-print">
        <slot name="actions" />
      </div>
    </header>
    <p v-if="answer" class="report-section__answer">{{ answer }}</p>
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
  text-wrap: balance;
}

.report-section__text {
  color: var(--text-muted);
  font: var(--text-small);
  overflow-wrap: anywhere;
}
/* The answer: one size for every card, a number or a sentence alike. */
.report-section__answer {
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
  text-wrap: balance;
}
</style>

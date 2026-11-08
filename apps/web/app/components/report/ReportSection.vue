<script setup lang="ts">
/**
 * A report card, one anatomy for every card (docs/design-system.md, «Карточка отчёта»): the
 * question in a quiet line, the answer in one sentence in the editorial face, an optional footnote,
 * then the card's own picture (the slot). The two sides are named inside the picture, never in a footer.
 * `tone="ink"` paints it in the person's poster colour: at most one such tile per part of the report.
 */
defineProps<{
  title?: string
  text?: string
  answer?: string | null
  wide?: boolean
  tone?: 'ink'
}>()
</script>

<template>
  <article class="tile report-section" :class="[{ 'report-section--wide': wide }, tone && `tile--${tone}`]">
    <header v-if="title || answer || text || $slots.actions || $slots.aside" class="report-section__head">
      <div class="report-section__copy">
        <h3 v-if="title" class="report-section__title">{{ title }}</h3>
        <p v-if="answer" class="report-section__answer">{{ answer }}</p>
        <p v-if="text" class="report-section__text">{{ text }}</p>
      </div>
      <div v-if="$slots.actions" class="report-section__actions no-print">
        <slot name="actions" />
      </div>
      <div v-if="$slots.aside" class="report-section__aside">
        <slot name="aside" />
      </div>
    </header>
    <slot />
  </article>
</template>

<style scoped>
.report-section {
  gap: var(--space-6);
  overflow: hidden;
}

.report-section--wide {
  grid-column: 1 / -1;
}

.report-section__head {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.report-section__copy {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
  max-width: var(--measure);
}

/* The question is quiet; the answer under it carries the card. */
.report-section__title {
  color: var(--text-muted);
  font: var(--text-ui);
  text-wrap: balance;
}

.report-section__answer {
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
  text-wrap: balance;
}

.report-section__answer::first-letter {
  text-transform: uppercase;
}

.report-section__text {
  color: var(--text-muted);
  font: var(--text-small);
  overflow-wrap: anywhere;
  text-wrap: pretty;
}
</style>

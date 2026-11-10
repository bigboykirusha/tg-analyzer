<script setup lang="ts">
/**
 * A report card — one anatomy for every card: the question in a quiet line, the answer in one sentence,
 * an optional note, then the card's own picture (the slot). `hero` is a part's first finding: no tile,
 * a bigger answer. `tone="ink"` paints it in the person's poster colour (at most one per part).
 */
defineProps<{
  title?: string
  text?: string
  answer?: string | null
  wide?: boolean
  hero?: boolean
  tone?: 'ink'
}>()
</script>

<template>
  <article
    class="report-section"
    :class="[hero ? 'report-section--hero' : 'tile', { 'report-section--wide': wide, 'tile--ink': tone === 'ink' }]"
  >
    <header v-if="title || answer || text || $slots.actions" class="report-section__head">
      <div class="report-section__copy">
        <h3 v-if="title" class="report-section__title">{{ title }}</h3>
        <p v-if="answer" class="report-section__answer">{{ answer }}</p>
        <p v-if="text" class="report-section__text">{{ text }}</p>
      </div>
      <div v-if="$slots.actions" class="report-section__actions no-print"><slot name="actions" /></div>
    </header>
    <slot />
    <p v-if="$slots.note" class="report-section__text"><slot name="note" /></p>
  </article>
</template>

<style scoped>
.report-section {
  min-width: 0;
}

/* A part's first finding stands on the room itself: no card, a bigger answer. */
.report-section--hero {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-2) 0 var(--space-3);
}

.report-section__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.report-section__copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.report-section__title {
  color: var(--text-muted);
  font: var(--text-small);
}

.report-section__answer {
  font: var(--text-h3);
  letter-spacing: var(--tracking-h3);
  text-wrap: balance;
}

.report-section--hero .report-section__answer {
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
}

.report-section__answer::first-letter {
  text-transform: uppercase;
}

.report-section__text {
  color: var(--text-muted);
  font: var(--text-small);
  overflow-wrap: anywhere;
}

.report-section__actions {
  flex: none;
}
</style>

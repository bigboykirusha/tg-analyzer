<script setup lang="ts">
/**
 * One part of the long report page: its title and the cards under it (two columns on desktop, one on a
 * phone). A card marked `wide` spans the row; a card left alone in its row takes the whole row, no hole.
 */
defineProps<{ id: string; title: string }>()
</script>

<template>
  <section :id="`chapter-${id}`" class="report-part" :aria-labelledby="`chapter-${id}-title`">
    <h2 :id="`chapter-${id}-title`" class="t-h1 report-part__title">{{ title }}</h2>
    <div class="report-cards"><slot /></div>
  </section>
</template>

<style scoped>
.report-part {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  padding-top: var(--space-8);
  scroll-margin-top: var(--space-4);
}

.report-part:first-child {
  padding-top: 0;
}

.report-cards {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);
  min-width: 0;
}

@media (min-width: 901px) {
  .report-part {
    gap: var(--space-4);
    padding-top: var(--space-10);
  }

  .report-cards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  .report-cards > :deep(.report-section--wide),
  .report-cards > :deep(.report-note) {
    grid-column: 1 / -1;
  }

  /* A card left alone in its row (a card before it or after it is wide, or missing) takes the whole row. */
  .report-cards > :deep(:first-child:not(.report-section--wide):has(+ .report-section--wide)),
  .report-cards > :deep(.report-section--wide + :not(.report-section--wide):has(+ .report-section--wide)),
  .report-cards > :deep(.report-section--wide + :not(.report-section--wide):last-child),
  .report-cards > :deep(:first-child:not(.report-section--wide):last-child) {
    grid-column: 1 / -1;
  }
}
</style>

<script setup lang="ts">
/**
 * One part of the long report page: its title and the cards under it (two columns on desktop, one on a
 * phone). A card marked `wide` spans the row; a card left alone in its row takes the whole row, no hole.
 */
defineProps<{ id: string; title: string }>()
</script>

<template>
  <section :id="`chapter-${id}`" class="report-part" :aria-labelledby="`chapter-${id}-title`" tabindex="-1">
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
  /* A hairline above each part, so the parts do not run into one ribbon of cards; the title stands below it. */
  margin-top: var(--space-4);
  padding-top: var(--space-6);
  box-shadow: var(--divider-top);
  /* A tap in the chapter strip stops the part under the bar (the page's `scroll-padding-top`) and the strip. */
  scroll-margin-top: calc(var(--control-sm) + var(--space-4));
}

.report-part:first-child {
  margin-top: 0;
  padding-top: 0;
  box-shadow: none;
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
    margin-top: var(--space-6);
    padding-top: var(--space-8);
    /* A computer: the strip is in the bar's own row, so the bar's height is all there is to clear. */
    scroll-margin-top: 0;
  }

  .report-part:first-child {
    margin-top: 0;
    padding-top: 0;
  }

  /*
   * Two cards to a row, wrapping: equal halves of one height side by side (a shorter card does not leave a gap
   * under it), and a card left alone in its row — whatever stands around it — grows to the whole row.
   */
  .report-cards {
    flex-flow: row wrap;
    align-items: stretch;
  }

  .report-cards > :deep(*) {
    flex: 1 1 40%;
    min-width: 0;
  }

  .report-cards > :deep(.report-section--wide) {
    flex-basis: 100%;
  }
}
</style>

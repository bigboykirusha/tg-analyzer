<script setup lang="ts">
/**
 * One chapter in the report. A block marked `wide` spans both desktop columns.
 * The comparison gives the table more room beside the lead finding.
 */
defineProps<{ id: string; title: string; comparison?: boolean }>()
</script>

<template>
  <section
    :id="`chapter-${id}`"
    class="report-part"
    :class="{ 'report-part--comparison': comparison }"
    :aria-labelledby="`chapter-${id}-title`"
  >
    <h2 :id="`chapter-${id}-title`" class="t-h1 report-part__title">{{ title }}</h2>
    <div class="report-cards"><slot /></div>
  </section>
</template>

<style scoped>
.report-part {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}

.report-part:not(:has(.report-cards > *)) {
  display: none;
}

.report-cards {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

@media (min-width: 901px) {
  .report-part {
    gap: var(--space-4);
  }

  /*
   * Two cards to a row, wrapping: equal halves of one height side by side (a shorter card does not leave a gap
   * under it), and a card left alone in its row — whatever stands around it — grows to the whole row.
   */
  .report-cards {
    flex-flow: row wrap;
    align-items: stretch;
    row-gap: var(--space-6);
  }

  .report-cards > :deep(*) {
    flex: 1 1 40%;
    min-width: 0;
  }

  .report-cards > :deep(.report-section--wide) {
    flex-basis: 100%;
  }

  .report-part--comparison .report-cards {
    align-items: flex-start;
    gap: var(--space-6);
  }

  .report-part--comparison .report-cards > :deep(.report-section:not(.report-section--wide)) {
    flex: 5 1 0;
  }

  .report-part--comparison .report-cards > :deep(.tile:not(.report-section--wide)) {
    flex-grow: 4;
  }
}
</style>

<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
/**
 * The top of every report: an ink tile with the message count and the pulse (the legend sits on
 * the title row, so the tile stays short), one lime tile with the headline comparison, then any
 * small number tiles.
 */
defineProps<{ data: ReportDto; label: string; value: string; note?: string | null }>()
</script>

<template>
  <div class="bento bento--split hero">
    <section class="tile tile--ink span-8 hero__main">
      <h2 class="hero__label">{{ label }}</h2>
      <div class="hero__figure t-num">{{ value }}</div>
      <p v-if="note" class="hero__note">{{ note }}</p>
      <ReportPulse :data="data" bare class="hero__pulse" />
    </section>
    <section class="tile tile--lime span-4 hero__accent">
      <slot name="accent" />
    </section>
    <slot />
  </div>
</template>

<style scoped>
/* Title and legend on one row, then the number, the chart and its axis. */
.hero__main {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  grid-template-areas:
    'label caption'
    'figure figure'
    'note note'
    'chart chart'
    'axis axis';
  align-content: start;
  gap: var(--space-4) var(--space-4);
}

.hero__label {
  grid-area: label;
  font: var(--text-title);
}

.hero__figure {
  grid-area: figure;
  font: var(--text-figure-lg);
  letter-spacing: var(--tracking-figure);
}

.hero__note {
  grid-area: note;
  color: var(--text-muted);
  font: var(--text-small);
}

.hero__pulse {
  display: contents;
}

.hero__pulse :deep(.pulse__caption) {
  grid-area: caption;
  align-self: center;
  justify-content: flex-start;
}

.hero__pulse :deep(.seismograph) {
  grid-area: chart;
  align-self: end;
}

.hero__pulse :deep(.pulse__axis) {
  grid-area: axis;
  margin-top: calc(var(--space-2) - var(--space-4));
}
</style>

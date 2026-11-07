<script setup lang="ts">
import type { ChapterDto, ReportDto } from '@tg-analyzer/shared'
/**
 * The top of every report: an ink tile with the message count, the pulse (the legend sits on the
 * title row, so the tile stays short) and the chapters or facts under it — the only volume chart
 * of the report — one lime tile with the headline comparison, then any small number tiles.
 * Chapters carry their own months, so the axis under the pulse goes away with them.
 */
defineProps<{
  data: ReportDto
  label: string
  value: string
  note?: string | null
  facts?: { key: string; label: string; value: string }[]
  chapters?: ChapterDto[]
}>()
</script>

<template>
  <div class="bento bento--split hero">
    <section class="tile tile--ink span-8 hero__main" :class="{ 'hero__main--chapters': chapters?.length }">
      <h2 class="hero__label">{{ label }}</h2>
      <div class="hero__figure t-num">{{ value }}</div>
      <p v-if="note" class="hero__note">{{ note }}</p>
      <ReportPulse :data="data" bare class="hero__pulse" />
      <ReportChapters v-if="chapters?.length" :chapters="chapters" class="hero__chapters" />
      <dl v-if="facts?.length" class="fact-line hero__facts">
        <div v-for="item in facts" :key="item.key">
          <dt>{{ item.label }}</dt>
          <dd class="t-num">{{ item.value }}</dd>
        </div>
      </dl>
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
    'axis axis'
    'chapters chapters'
    'facts facts';
  align-content: start;
  gap: var(--space-4) var(--space-4);
}

.hero__label {
  grid-area: label;
  font: var(--text-title);
}

.hero__figure {
  grid-area: figure;
  font: var(--text-figure);
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

.hero__facts {
  grid-area: facts;
}

.hero__chapters {
  grid-area: chapters;
  margin-top: calc(var(--space-2) - var(--space-4));
}

.hero__main--chapters .hero__pulse :deep(.pulse__axis) {
  display: none;
}

.hero__pulse :deep(.pulse__axis) {
  grid-area: axis;
  margin-top: calc(var(--space-2) - var(--space-4));
}
</style>

<script setup lang="ts">
/**
 * One part of the long report page, a target for `ReportNav`. With `columns`
 * its cards are laid out as masonry (two columns on wide screens, each card at its
 * own height); the tabs inside then render their cards without a wrapper of their own.
 */
defineProps<{ id: string; title: string; columns?: boolean }>()
const columnsRef = ref<HTMLElement | null>(null)
const { ready } = useMasonry(columnsRef)
</script>

<template>
  <section :id="`part-${id}`" class="report-part" :aria-labelledby="`part-${id}-title`">
    <h2 :id="`part-${id}-title`" class="report-part__title t-h1">{{ title }}</h2>
    <div v-if="columns" ref="columnsRef" class="report-columns" :class="{ 'is-ready': ready }"><slot /></div>
    <slot v-else />
  </section>
</template>

<style scoped>
/* A chapter of the report: a hairline, its number and its name, like a section of a magazine. */
.report-part {
  display: grid;
  gap: var(--space-6);
  padding-top: var(--space-6);
  border-top: 1px solid var(--border);
  counter-increment: report-part;
  scroll-margin-top: calc(var(--topbar-height) + var(--space-16));
}

.report-part__title {
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
}

.report-part__title::before {
  content: counter(report-part, decimal-leading-zero);
  color: var(--text-muted);
  font: var(--text-h3);
  letter-spacing: 0;
}

@media (max-width: 640px) {
  .report-part {
    gap: var(--space-4);
    padding-top: var(--space-4);
  }
}
</style>

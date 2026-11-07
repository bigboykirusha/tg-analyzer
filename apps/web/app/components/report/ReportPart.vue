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
    <h2 :id="`part-${id}-title`" class="t-h1">{{ title }}</h2>
    <div v-if="columns" ref="columnsRef" class="report-columns" :class="{ 'is-ready': ready }"><slot /></div>
    <slot v-else />
  </section>
</template>

<style scoped>
/* A part of the report: a large title and its cards, separated from the previous part by space alone. */
.report-part {
  display: grid;
  gap: var(--space-4);
  padding-top: var(--space-8);
  scroll-margin-top: calc(var(--topbar-height) + var(--space-16));
}

@media (max-width: 640px) {
  .report-part {
    padding-top: var(--space-4);
  }
}
</style>

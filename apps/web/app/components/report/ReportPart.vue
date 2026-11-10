<script setup lang="ts">
/**
 * One part of the long report page, a target for `ReportNav`. With `columns`
 * its cards are laid out as masonry (two columns on wide screens, each card at its
 * own height); the tabs inside then render their cards without a wrapper of their own.
 */
/** `answer`: the chapter's finding in one sentence, the same one «Главное» shows (useChapterHeadlines). */
defineProps<{ id: string; title: string; columns?: boolean; answer?: string | null }>()
const columnsRef = ref<HTMLElement | null>(null)
const { ready } = useMasonry(columnsRef)
</script>

<template>
  <section :id="`part-${id}`" class="report-part" :aria-labelledby="`part-${id}-title`">
    <header class="report-part__head">
      <h2 :id="`part-${id}-title`" class="t-h1">{{ title }}</h2>
      <p v-if="answer" class="report-part__answer">{{ answer }}</p>
    </header>
    <div v-if="columns" ref="columnsRef" class="report-columns" :class="{ 'is-ready': ready }"><slot /></div>
    <slot v-else />
  </section>
</template>

<style scoped>
/* A part: its title, the answer in one sentence, then its cards. Parts are separated by space alone. */
.report-part {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-8);
  scroll-margin-top: var(--space-4);
}

.report-part__head {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding-bottom: var(--space-1);
}

.report-part__answer {
  max-width: var(--measure);
  color: var(--text-muted);
  font: var(--text-small);
}

@media (min-width: 901px) {
  .report-part {
    gap: var(--space-4);
    padding-top: var(--space-10);
  }

  .report-part__answer {
    font: var(--text-body);
  }
}
</style>

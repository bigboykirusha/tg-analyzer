<script setup lang="ts">
import type { ChapterHeadline } from '../../composables/useChapterHeadlines'

/**
 * Wide screens (≥ 1200 px): «Главное о вас двоих» becomes the report's table of contents — a pinned
 * column beside the chapters, each with its answer, the one being read marked. It replaces the tab
 * bar in the header; phones and tablets keep the overview card and the capsule.
 */
const props = defineProps<{ headlines: ChapterHeadline[]; group?: boolean }>()
const { t } = useI18n()
const spy = useChapterSpy(() => props.headlines.map((headline) => headline.id))
const current = computed(() => spy.current.value ?? props.headlines[0]?.id ?? null)
</script>

<template>
  <nav class="toc no-print" :aria-label="group ? t('report.headline.titleGroup') : t('report.headline.title')">
    <a
      v-for="headline in headlines"
      :key="headline.id"
      :href="`#part-${headline.id}`"
      class="toc__row"
      :aria-current="headline.id === current ? 'location' : undefined"
      @click.prevent="spy.go(headline.id)"
    >
      <strong>{{ headline.label }}</strong>
      <span v-if="headline.text">{{ headline.text }}</span>
    </a>
  </nav>
</template>

<style scoped>
.toc {
  display: none;
}

/* Only wide screens draw the column; phones and tablets keep the overview card and the capsule. */
@media (min-width: 1200px) {
  .toc {
    position: sticky;
    top: calc(var(--topbar-height) + var(--space-6));
    display: grid;
    gap: var(--space-1);
    align-self: start;
  }
}

.toc__row {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  color: var(--text);
  text-decoration: none;
  transition: background-color var(--transition-fast);
}

.toc__row strong {
  font: var(--text-title);
  font-weight: 600;
}

.toc__row span {
  color: var(--text-muted);
  font: var(--text-small);
  text-wrap: pretty;
}

/* The chapter being read is a white card on the room, like the selected row of the sidebar. */
.toc__row[aria-current] {
  background: var(--surface);
  box-shadow: var(--shadow-segment);
}

@media (hover: hover) and (pointer: fine) {
  .toc__row:not([aria-current]):hover {
    background: var(--hover);
  }
}
</style>

<script setup lang="ts">
import type { ChapterHeadline } from '../../composables/useChapterHeadlines'
import { ChevronRight } from '../../lib/icons'

/**
 * «Главное о вас двоих»: the overview before the details — one sentence per chapter, each leading to
 * its chapter (`#part-<id>`). The same sentences open the chapters and fill the header's chapter list.
 */
const props = defineProps<{ headlines: ChapterHeadline[]; group?: boolean }>()
const { t } = useI18n()
const titleId = useId()
const rows = computed(() => props.headlines.filter((headline) => headline.text))
</script>

<template>
  <section v-if="rows.length" class="tile highlights" :aria-labelledby="titleId">
    <h2 :id="titleId" class="highlights__title">
      {{ group ? t('report.headline.titleGroup') : t('report.headline.title') }}
    </h2>
    <a v-for="row in rows" :key="row.id" :href="`#part-${row.id}`" class="highlights__row">
      <span class="highlights__text">{{ row.text }}</span>
      <span class="highlights__chapter">{{ row.label }}<ChevronRight aria-hidden="true" /></span>
    </a>
  </section>
</template>

<style scoped>
.highlights {
  gap: 0;
}

.highlights__title {
  padding-bottom: var(--space-3);
  color: var(--text-muted);
  font: var(--text-ui);
}

/* One finding per row: the sentence large, the chapter it opens under it in the person's colour. */
.highlights__row {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-4) 0;
  box-shadow: var(--divider-top);
  color: var(--text);
  text-decoration: none;
}

.highlights__row:last-child {
  padding-bottom: 0;
}

.highlights__text {
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
  text-wrap: balance;
}

.highlights__chapter {
  display: inline-flex;
  align-items: center;
  gap: var(--space-0-5);
  color: var(--them-ink);
  font: var(--text-small);
  font-weight: 500;
  --icon-size: var(--icon-sm);
}

.highlights__row:active .highlights__text {
  opacity: 0.6;
}

@media (hover: hover) and (pointer: fine) {
  .highlights__row:hover .highlights__chapter {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
}
</style>

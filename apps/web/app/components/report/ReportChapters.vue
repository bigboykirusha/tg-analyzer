<script setup lang="ts">
import type { ChapterDto } from '@tg-analyzer/shared'

/**
 * Chapters of the chat under the pulse, on its time scale: each chapter is as wide as its days,
 * a hairline on top with the name and the months under it. The busiest chapter's hairline is the
 * partner colour, a silence is dashed. Narrow chapters keep only the hairline (name in the tooltip).
 */
const props = defineProps<{ chapters: ChapterDto[] }>()
const { t, formatMonth } = useI18n()
const isPhone = useMediaQuery('(max-width: 640px)')

const total = computed(() => props.chapters.reduce((sum, chapter) => sum + chapter.days, 0))
/**
 * The axis under the pulse is gone, so the first visible month carries its year, and so does
 * every visible month where the year changes. Narrow chapters keep only the hairline.
 */
const items = computed(() => {
  let shownYear: string | null = null
  const month = (value: string, year: boolean) =>
    formatMonth(value, year ? { month: 'short', year: 'numeric' } : { month: 'short' })
  return props.chapters.map((chapter) => {
    const from = chapter.from.slice(0, 7)
    const to = chapter.to.slice(0, 7)
    const share = chapter.days / Math.max(1, total.value)
    /** Below this share of the width the words would not fit. */
    const labelled = share >= (isPhone.value ? 0.2 : 0.11)
    const fromLabel = month(from, from.slice(0, 4) !== shownYear)
    const toLabel = month(to, to.slice(0, 4) !== from.slice(0, 4))
    if (labelled) shownYear = to.slice(0, 4)
    return {
      key: chapter.from,
      kind: chapter.kind,
      name: t(`report.chapters.kind.${chapter.kind}`),
      period: from === to ? fromLabel : `${fromLabel} – ${toLabel}`,
      days: chapter.days,
      labelled,
    }
  })
})
</script>

<template>
  <ol class="chapters" :aria-label="t('report.chapters.label')">
    <li
      v-for="item in items"
      :key="item.key"
      class="chapter"
      :class="`chapter--${item.kind}`"
      :style="{ flexGrow: item.days }"
      :title="`${item.name} · ${item.period}`"
    >
      <template v-if="item.labelled">
        <span class="chapter__name">{{ item.name }}</span>
        <span class="chapter__period nowrap">{{ item.period }}</span>
      </template>
      <span v-else class="sr-only">{{ item.name }}, {{ item.period }}</span>
    </li>
  </ol>
</template>

<style scoped>
.chapters {
  display: flex;
  gap: var(--space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.chapter {
  display: grid;
  flex-basis: 0;
  align-content: start;
  gap: var(--space-1);
  min-width: 0;
  padding-top: var(--space-2);
  border-top: 2px solid var(--border);
  font: var(--text-caption);
}

.chapter--peak {
  border-top-color: var(--them);
}

.chapter--quiet {
  border-top-style: dashed;
}

.chapter__name,
.chapter__period {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter__period {
  color: var(--text-muted);
}
</style>

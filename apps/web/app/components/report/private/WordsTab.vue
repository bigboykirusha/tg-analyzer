<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

const props = defineProps<{ data: ReportDto }>()
const { t, formatDecimal } = useI18n()

const vocabulary = computed(() => props.data.report.vocabulary)
const hasText = computed(
  () =>
    vocabulary.value.topWordsBySender.mine.length +
      vocabulary.value.topWordsBySender.theirs.length +
      vocabulary.value.topEmojiBySender.mine.length +
      vocabulary.value.topEmojiBySender.theirs.length >
    0,
)
</script>

<template>
  <UiEmptyState v-if="!hasText" :title="t('report.words.emptyTitle')" :description="t('report.words.emptyText')" />
  <div v-else class="report-grid report-grid--even">
    <ReportWordOfChat :data="data" />
    <ReportSection wide :title="t('report.fmt.wordsTitle')">
      <div class="sides">
        <div class="side">
          <span class="side__who"
            >{{ t('report.you') }} ·
            {{ t('report.words.perMessage', { value: formatDecimal(vocabulary.wordsPerMessage.mine) }) }}</span
          >
          <WordChips :items="vocabulary.topWordsBySender.mine.slice(0, 10)" :empty="t('report.words.none')" />
        </div>
        <div class="side">
          <span class="side__who"
            >{{ data.summary.title }} ·
            {{ t('report.words.perMessage', { value: formatDecimal(vocabulary.wordsPerMessage.theirs) }) }}</span
          >
          <WordChips :items="vocabulary.topWordsBySender.theirs.slice(0, 10)" :empty="t('report.words.none')" />
        </div>
      </div>
    </ReportSection>

    <ReportSection
      v-if="vocabulary.uniqueWordsBySender.mine.length"
      :title="t('report.words.distinctiveMine')"
      :text="t('report.words.distinctiveMineText')"
    >
      <WordChips :items="vocabulary.uniqueWordsBySender.mine.slice(0, 12)" :empty="t('report.words.none')" />
    </ReportSection>
    <ReportSection
      v-if="vocabulary.uniqueWordsBySender.theirs.length"
      :title="t('report.words.distinctiveTheirs')"
      :text="t('report.words.distinctiveTheirsText')"
    >
      <WordChips :items="vocabulary.uniqueWordsBySender.theirs.slice(0, 12)" :empty="t('report.words.none')" />
    </ReportSection>

    <ReportSection wide :title="t('report.fmt.emojiTitle')">
      <div class="sides">
        <div class="side">
          <span class="side__who">{{ t('report.you') }}</span>
          <WordChips :items="vocabulary.topEmojiBySender.mine.slice(0, 6)" :empty="t('report.words.none')" />
        </div>
        <div class="side">
          <span class="side__who">{{ data.summary.title }}</span>
          <WordChips :items="vocabulary.topEmojiBySender.theirs.slice(0, 6)" :empty="t('report.words.none')" />
        </div>
      </div>
    </ReportSection>
  </div>
</template>

<style scoped>
/* Both of you in one card: side by side on a wide screen, one under the other on a phone. */
.sides {
  display: grid;
  gap: var(--space-5);
}

@media (min-width: 641px) {
  .sides {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-8);
  }
}

.side {
  display: grid;
  align-content: start;
  gap: var(--space-2);
}

.side__who {
  color: var(--text-muted);
  font: var(--text-caption);
}
</style>

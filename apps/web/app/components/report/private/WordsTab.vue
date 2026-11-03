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
    <ReportSection
      :title="t('report.fmt.wordsMine')"
      :text="t('report.words.perMessage', { value: formatDecimal(vocabulary.wordsPerMessage.mine) })"
    >
      <WordChips :items="vocabulary.topWordsBySender.mine.slice(0, 10)" :empty="t('report.words.none')" />
    </ReportSection>
    <ReportSection
      :title="t('report.fmt.wordsTheirs')"
      :text="t('report.words.perMessage', { value: formatDecimal(vocabulary.wordsPerMessage.theirs) })"
    >
      <WordChips :items="vocabulary.topWordsBySender.theirs.slice(0, 10)" :empty="t('report.words.none')" />
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

    <ReportSection :title="t('report.fmt.emojiMine')">
      <WordChips :items="vocabulary.topEmojiBySender.mine.slice(0, 8)" :empty="t('report.words.none')" />
    </ReportSection>
    <ReportSection :title="t('report.fmt.emojiTheirs')">
      <WordChips :items="vocabulary.topEmojiBySender.theirs.slice(0, 8)" :empty="t('report.words.none')" />
    </ReportSection>
  </div>
</template>

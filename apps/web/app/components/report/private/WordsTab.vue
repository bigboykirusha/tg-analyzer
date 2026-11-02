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
    <ReportSection
      :title="t('report.words.topMine')"
      :text="t('report.words.perMessage', { value: formatDecimal(vocabulary.wordsPerMessage.mine) })"
    >
      <ReportTopList :items="vocabulary.topWordsBySender.mine" :limit="10" :empty="t('report.words.none')" />
    </ReportSection>
    <ReportSection
      :title="t('report.words.topTheirs')"
      :text="t('report.words.perMessage', { value: formatDecimal(vocabulary.wordsPerMessage.theirs) })"
    >
      <ReportTopList
        :items="vocabulary.topWordsBySender.theirs"
        :limit="10"
        side="theirs"
        :empty="t('report.words.none')"
      />
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

    <ReportSection :title="t('report.words.emojiMine')">
      <ReportTopList :items="vocabulary.topEmojiBySender.mine" :limit="6" :empty="t('report.words.none')" />
    </ReportSection>
    <ReportSection :title="t('report.words.emojiTheirs')">
      <ReportTopList
        :items="vocabulary.topEmojiBySender.theirs"
        :limit="6"
        side="theirs"
        :empty="t('report.words.none')"
      />
    </ReportSection>
  </div>
</template>

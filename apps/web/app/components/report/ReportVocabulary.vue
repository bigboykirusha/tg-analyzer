<script setup lang="ts">
import { splitVocabulary, type ReportDto } from '@tg-analyzer/shared'

/**
 * «Ваш словарь», each word in one place (`splitVocabulary`): the words only you lean on, the ones only
 * the other side does, and the ones you share. The word of the chat has a card of its own and is left
 * out here.
 */
const props = defineProps<{ data: ReportDto }>()
const { t } = useI18n()

const vocabulary = computed(() => props.data.report.vocabulary)
const name = computed(() => props.data.summary.title)
const split = computed(() =>
  splitVocabulary(vocabulary.value.topWordsBySender.mine, vocabulary.value.topWordsBySender.theirs, {
    exclusive: vocabulary.value.uniqueWordsBySender,
    exclude: vocabulary.value.topWords.slice(0, 1).map((item) => item.value),
  }),
)
const hasWords = computed(() => split.value.shared.length + split.value.mine.length + split.value.theirs.length > 0)
</script>

<template>
  <ReportSection v-if="hasWords" :title="t('report.words.title')">
    <ReportSideGroups :mine="split.mine" :theirs="split.theirs" :shared="split.shared" :name="name" :counts="false" />
  </ReportSection>
</template>

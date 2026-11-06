<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'

/** «О чём»: the word of the chat, then «Ваш словарь» and «Любимые эмодзи», each on its own row. */
const props = defineProps<{ data: ReportDto }>()
const { t } = useI18n()

const vocabulary = computed(() => props.data.report.vocabulary)
const hasText = computed(
  () =>
    vocabulary.value.topWordsBySender.mine.length +
      vocabulary.value.topWordsBySender.theirs.length +
      vocabulary.value.topEmoji.length >
    0,
)
</script>

<template>
  <UiEmptyState v-if="!hasText" :title="t('report.words.emptyTitle')" :description="t('report.words.emptyText')" />
  <template v-else>
    <ReportWordOfChat :data="data" />
    <ReportVocabulary :data="data" />
    <ReportEmoji :data="data" />
  </template>
</template>

<script setup lang="ts">
import { splitVocabulary, type ReportDto } from '@tg-analyzer/shared'

/**
 * «Любимые эмодзи»: the chat's favourites with their counts, one row of outlined chips. The answer names
 * the favourite — shared, when both of you send it — and how many times.
 */
const props = defineProps<{ data: ReportDto }>()
const { t, tc, formatNumber } = useI18n()

const vocabulary = computed(() => props.data.report.vocabulary)
const split = computed(() =>
  splitVocabulary(vocabulary.value.topEmojiBySender.mine, vocabulary.value.topEmojiBySender.theirs),
)
const answer = computed(() => {
  const top = vocabulary.value.topEmoji[0]
  if (!top) return null
  const shared = split.value.shared.some((item) => item.value === top.value)
  return shared
    ? tc('report.emoji.answerShared', top.count, { emoji: top.value, count: formatNumber(top.count) })
    : tc('report.emoji.answerTop', top.count, { emoji: top.value, count: formatNumber(top.count) })
})
const top = computed(() => vocabulary.value.topEmoji.slice(0, 8))
</script>

<template>
  <ReportSection v-if="top.length" wide :title="t('report.emoji.title')" :answer="answer">
    <WordChips :items="top" tone="shared" />
  </ReportSection>
</template>

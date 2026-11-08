<script setup lang="ts">
import { splitVocabulary, type ReportDto } from '@tg-analyzer/shared'

/**
 * «Любимые эмодзи», like the vocabulary: the emoji only you send, the ones only the other side does and
 * the ones you share, each with its count. The answer names the favourite you share and how many times
 * you both sent it — or simply the chat's favourite when you share none.
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
const has = computed(() => split.value.mine.length + split.value.theirs.length + split.value.shared.length > 0)
</script>

<template>
  <ReportSection v-if="has" :title="t('report.emoji.title')" :answer="answer">
    <ReportSideGroups :mine="split.mine" :theirs="split.theirs" :shared="split.shared" :name="data.summary.title" />
  </ReportSection>
</template>

<script setup lang="ts">
import { splitVocabulary, type ReportDto } from '@tg-analyzer/shared'

/**
 * «Ваш словарь», each word in one place (`splitVocabulary`): the words only you lean on, the ones only
 * the other side does, and the ones you share. The word of the chat has a card of its own and is left
 * out here.
 */
const props = defineProps<{ data: ReportDto }>()
const { t } = useI18n()
const author = useReportAuthor()

const vocabulary = computed(() => props.data.report.vocabulary)
const name = computed(() => props.data.summary.title)
const split = computed(() =>
  splitVocabulary(vocabulary.value.topWordsBySender.mine, vocabulary.value.topWordsBySender.theirs, {
    exclusive: vocabulary.value.uniqueWordsBySender,
    exclude: vocabulary.value.topWords.slice(0, 1).map((item) => item.value),
  }),
)
/** «Вы чаще пишете «кофе», Мила — «job»»: each side's own word; «Говорите одними словами» when none. */
const answer = computed(() => {
  const mine = split.value.mine[0]?.value
  const theirs = split.value.theirs[0]?.value
  // A guest reads the author's name where the owner reads «вы».
  if (author.value && mine)
    return theirs
      ? t('report.words.answerBothNamed', { me: author.value, mine, theirs, name: name.value })
      : t('report.words.answerTheirs', { word: mine, name: author.value })
  if (mine && theirs) return t('report.words.answerBoth', { mine, theirs, name: name.value })
  if (mine) return t('report.words.answerMine', { word: mine })
  if (theirs) return t('report.words.answerTheirs', { word: theirs, name: name.value })
  return t('report.words.answerShared')
})
const hasWords = computed(() => split.value.shared.length + split.value.mine.length + split.value.theirs.length > 0)
</script>

<template>
  <ReportSection v-if="hasWords" :title="t('report.words.title')" :answer="answer">
    <ReportSideGroups :mine="split.mine" :theirs="split.theirs" :shared="split.shared" :name="name" :counts="false" />
  </ReportSection>
</template>

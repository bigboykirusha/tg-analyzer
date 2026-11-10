import type { ReportDto } from '@tg-analyzer/shared'

/**
 * «Слова»: the word of the chat as the answer, then what each side says that the other does not. The report
 * card, the guest's page and the «Итоги» frame read the same facts, the words as they are.
 */
export function useWordsFacts(data: () => ReportDto, options: { limit?: number } = {}) {
  const { t, tc } = useI18n()
  const limit = options.limit ?? 5

  const words = computed(() => data().derived.words)
  const word = computed(() => words.value.wordOfChat)
  const mine = computed(() => words.value.vocabulary.mine.slice(0, limit))
  const theirs = computed(() => words.value.vocabulary.theirs.slice(0, limit))
  const figure = computed(() => (word.value ? `«${word.value.value}»` : null))
  const answer = computed(() => (word.value ? tc('report.words.word', word.value.count) : t('report.words.differ')))
  const any = computed(() => Boolean(word.value || mine.value.length || theirs.value.length))

  return { words, word, mine, theirs, figure, answer, any }
}

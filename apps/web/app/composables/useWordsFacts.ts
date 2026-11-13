import type { ReportDto } from '@tg-analyzer/shared'

/**
 * «Слова»: the word of the chat as the answer, then what each side says that the other does not. The report
 * card, the guest's page and the «Итоги» frame read the same facts, the words as they are.
 */
export function useWordsFacts(data: () => ReportDto, options: { limit?: number } = {}) {
  const { t, tc, quote } = useI18n()
  const limit = options.limit ?? 5

  const words = computed(() => data().derived.words)
  const word = computed(() => words.value.wordOfChat)
  const mine = computed(() => words.value.vocabulary.mine.slice(0, limit))
  const theirs = computed(() => words.value.vocabulary.theirs.slice(0, limit))
  const figure = computed(() => (word.value ? quote(word.value.value) : null))
  const answer = computed(() => (word.value ? tc('report.words.word', word.value.count) : t('report.words.differ')))
  const any = computed(() => Boolean(word.value || mine.value.length || theirs.value.length))
  /**
   * Neither side has words of its own (you write alike): the chat's next most frequent words — the list of the
   * report's «Чаще всего» — stand under the word of the chat, so a card or a frame is not left empty.
   */
  const next = computed(() =>
    mine.value.length || theirs.value.length
      ? []
      : words.value.topWords.filter((item) => item.value !== word.value?.value).slice(0, 6),
  )

  return { words, word, mine, theirs, next, figure, answer, any }
}

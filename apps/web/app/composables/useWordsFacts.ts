import type { ReportDto } from '@tg-analyzer/shared'

/**
 * «Слова»: the word of the chat as the answer, then what each side says that the other does not. The report
 * card, the guest's page and the «Итоги» frame read the same facts; `source` picks the words as the owner
 * sees them (`view`, with the obscene ones as they chose) or the clean ones for a picture (`clean`).
 */
export function useWordsFacts(data: () => ReportDto, options: { source?: 'view' | 'clean'; limit?: number } = {}) {
  const { t, tc } = useI18n()
  const limit = options.limit ?? 5

  const words = computed(() => data().derived.words)
  const source = computed(() => (options.source === 'clean' ? words.value.clean : words.value.view))
  const word = computed(() => source.value.wordOfChat)
  const mine = computed(() => source.value.vocabulary.mine.slice(0, limit))
  const theirs = computed(() => source.value.vocabulary.theirs.slice(0, limit))
  const figure = computed(() => (word.value ? `«${word.value.value}»` : null))
  const answer = computed(() => (word.value ? tc('report.words.word', word.value.count) : t('report.words.differ')))
  const any = computed(() => Boolean(word.value || mine.value.length || theirs.value.length))

  return { words, word, mine, theirs, figure, answer, any }
}

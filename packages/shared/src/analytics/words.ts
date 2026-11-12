import type { ChatReport, DerivedGroupWords, DerivedWordsView, GroupReportDto } from '../api/types'
import { isSignificantWordOfChat, MIN_SHARED_WORD_COUNT, MIN_VOCABULARY_WORD_COUNT, withMinCount } from './significance'
import { splitVocabulary } from './vocabulary'

/** Chips per side in «Слова»: the report shows no more. */
const SIGNATURE_LIMIT = 5
const SHARED_LIMIT = 5

/**
 * The words of a report ready to show, with the findings that stand on too little left out:
 * the word of the chat needs real weight ({@link isSignificantWordOfChat}), a signature word needs
 * {@link MIN_VOCABULARY_WORD_COUNT} uses.
 */
export function deriveWords(report: ChatReport): DerivedWordsView {
  const { vocabulary } = report
  const topWords = vocabulary.topWords
  const first = topWords[0] ?? null
  const wordOfChat = first && isSignificantWordOfChat(first.count, report.totals.textMessages) ? first : null

  // Split on the stored lists as they are: «a full list» (20 words) is how the split knows a word may
  // have been cut off.
  const split = splitVocabulary(vocabulary.topWordsBySender.mine, vocabulary.topWordsBySender.theirs, {
    sharedLimit: 20,
    signatureLimit: 20,
    minCount: MIN_VOCABULARY_WORD_COUNT,
    exclusive: vocabulary.uniqueWordsBySender,
    exclude: wordOfChat ? [wordOfChat.value] : [],
  })

  return {
    wordOfChat,
    topWords,
    vocabulary: {
      shared: withMinCount(split.shared, MIN_SHARED_WORD_COUNT).slice(0, SHARED_LIMIT),
      mine: split.mine.slice(0, SIGNATURE_LIMIT),
      theirs: split.theirs.slice(0, SIGNATURE_LIMIT),
    },
    group: report.group ? deriveGroupWords(report.group) : null,
  }
}

function deriveGroupWords(group: GroupReportDto): DerivedGroupWords {
  return {
    shared: withMinCount(group.sharedVocabulary, MIN_SHARED_WORD_COUNT),
    unique: withMinCount(group.uniqueGroupWords, MIN_VOCABULARY_WORD_COUNT),
    members: Object.fromEntries(
      group.participants.map((participant) => [
        participant.id,
        {
          topWords: withMinCount(participant.topWords, MIN_VOCABULARY_WORD_COUNT),
          // A signature word's `count` is how many times more often the person uses it than the group (a ratio),
          // not a number of uses, so a threshold of uses does not apply: the analysis keeps only words used
          // at least three times.
          topicSignature: participant.topicSignature,
        },
      ]),
    ),
  }
}

import type {
  ChatReport,
  DerivedGroupWords,
  DerivedWordsView,
  GroupReportDto,
  ProfanityMode,
  TopItemDto,
} from '../api/types'
import { isProfane, withoutProfanity } from './profanity'
import { isSignificantWordOfChat, MIN_SHARED_WORD_COUNT, MIN_VOCABULARY_WORD_COUNT, withMinCount } from './significance'
import { splitVocabulary } from './vocabulary'

/** Chips per side in «Слова»: the report shows no more. */
const SIGNATURE_LIMIT = 5
const SHARED_LIMIT = 5

const keep = (mode: ProfanityMode) => (items: readonly TopItemDto[]) =>
  mode === 'hidden' ? withoutProfanity(items) : [...items]

/** Whether any word list of the report holds an obscene word: the report may offer to show them. */
export function reportHasProfanity(report: ChatReport): boolean {
  const lists: (readonly TopItemDto[])[] = [
    report.vocabulary.topWords,
    report.vocabulary.topWordsBySender.mine,
    report.vocabulary.topWordsBySender.theirs,
    report.vocabulary.uniqueWordsBySender.mine,
    report.vocabulary.uniqueWordsBySender.theirs,
  ]
  const group = report.group
  if (group) {
    lists.push(group.sharedVocabulary, group.uniqueGroupWords)
    for (const participant of group.participants) lists.push(participant.topWords, participant.topicSignature)
  }
  return lists.some((items) => items.some((item) => isProfane(item.value)))
}

/**
 * The report with obscene words taken out of every word list: the word the owner sees by default,
 * and the only one that may leave the owner's screen. Counts, order and everything else stay.
 */
export function hideProfanity(report: ChatReport): ChatReport {
  const { vocabulary, group } = report
  return {
    ...report,
    vocabulary: {
      ...vocabulary,
      topWords: withoutProfanity(vocabulary.topWords),
      topWordsBySender: {
        mine: withoutProfanity(vocabulary.topWordsBySender.mine),
        theirs: withoutProfanity(vocabulary.topWordsBySender.theirs),
      },
      uniqueWordsBySender: {
        mine: withoutProfanity(vocabulary.uniqueWordsBySender.mine),
        theirs: withoutProfanity(vocabulary.uniqueWordsBySender.theirs),
      },
    },
    group: group ? hideGroupProfanity(group) : null,
  }
}

function hideGroupProfanity(group: GroupReportDto): GroupReportDto {
  return {
    ...group,
    sharedVocabulary: withoutProfanity(group.sharedVocabulary),
    uniqueGroupWords: withoutProfanity(group.uniqueGroupWords),
    participants: group.participants.map((participant) => ({
      ...participant,
      topWords: withoutProfanity(participant.topWords),
      topicSignature: withoutProfanity(participant.topicSignature),
    })),
  }
}

/**
 * The words of a report ready to show, with the findings that stand on too little left out:
 * the word of the chat needs real weight ({@link isSignificantWordOfChat}), a signature word needs
 * {@link MIN_VOCABULARY_WORD_COUNT} uses. With `mode: 'hidden'` obscene words are not there at all,
 * so the word of the chat is the next clean one, not a gap.
 */
export function deriveWords(report: ChatReport, mode: ProfanityMode): DerivedWordsView {
  const clean = keep(mode)
  const { vocabulary } = report
  const topWords = clean(vocabulary.topWords)
  const first = topWords[0] ?? null
  const wordOfChat = first && isSignificantWordOfChat(first.count, report.totals.textMessages) ? first : null

  // Split on the stored lists as they are: «a full list» (20 words) is how the split knows a word may
  // have been cut off, and that is lost once the obscene words are removed. The output is cleaned after.
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
      shared: withMinCount(clean(split.shared), MIN_SHARED_WORD_COUNT).slice(0, SHARED_LIMIT),
      mine: clean(split.mine).slice(0, SIGNATURE_LIMIT),
      theirs: clean(split.theirs).slice(0, SIGNATURE_LIMIT),
    },
    group: report.group ? deriveGroupWords(report.group, mode) : null,
  }
}

function deriveGroupWords(group: GroupReportDto, mode: ProfanityMode): DerivedGroupWords {
  const clean = keep(mode)
  return {
    shared: withMinCount(clean(group.sharedVocabulary), MIN_SHARED_WORD_COUNT),
    unique: withMinCount(clean(group.uniqueGroupWords), MIN_VOCABULARY_WORD_COUNT),
    members: Object.fromEntries(
      group.participants.map((participant) => [
        participant.id,
        {
          topWords: withMinCount(clean(participant.topWords), MIN_VOCABULARY_WORD_COUNT),
          topicSignature: withMinCount(clean(participant.topicSignature), MIN_VOCABULARY_WORD_COUNT),
        },
      ]),
    ),
  }
}

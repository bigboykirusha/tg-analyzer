import {
  MIN_REPORT_MESSAGES,
  type ChatReport,
  type QuizQuestionDto,
  type QuizQuestionId,
  type QuizUnit,
} from '../api/types'

/** The game asks this many questions at most. */
export const QUIZ_LENGTH = 5
/** Fewer messages make every answer a coin flip. */
const MIN_MESSAGES = MIN_REPORT_MESSAGES
const MIN_REPLIES = 10
/** Two sides this close are a tie, and a tie has no right answer. */
const MIN_LEAD = 0.15

interface Candidate {
  id: QuizQuestionId
  unit: QuizUnit
  mine: number | null | undefined
  theirs: number | null | undefined
  /** The smaller value wins (a faster answer). */
  lowerWins?: boolean
  /** Below this sum of both sides the answer is chance. */
  minTotal?: number
}

/**
 * «Who more?» questions for a private chat, read from the stored report, so
 * old reports get them too. They are ordered so that neighbours differ: who
 * starts, who is faster, who writes more, then the habits. Ties and thin data
 * are skipped, and only {@link QUIZ_LENGTH} questions are returned.
 */
export function deriveQuiz(report: ChatReport): QuizQuestionDto[] {
  if (report.group || report.totals.messages < MIN_MESSAGES) return []
  const { responses, habits, vocabulary, voice, stickers } = report
  const enoughReplies = responses.mineSamples >= MIN_REPLIES && responses.theirsSamples >= MIN_REPLIES
  const writesFirst = responses.iWriteFirstPct
  const lastWord = habits?.lastWordMinePct

  const candidates: Candidate[] = [
    {
      id: 'starts',
      unit: 'percent',
      mine: writesFirst,
      theirs: writesFirst == null ? null : 100 - writesFirst,
      minTotal: 0,
    },
    {
      id: 'fastest',
      unit: 'seconds',
      mine: enoughReplies ? responses.medianMineSec : null,
      theirs: enoughReplies ? responses.medianTheirsSec : null,
      lowerWins: true,
      minTotal: 0,
    },
    { id: 'talker', unit: 'count', mine: report.totals.sent, theirs: report.totals.received },
    { id: 'laughs', unit: 'count', mine: habits?.laughs.mine, theirs: habits?.laughs.theirs, minTotal: 20 },
    {
      id: 'voice',
      unit: 'seconds',
      mine: voice ? voice.voice.seconds.mine + voice.round.seconds.mine : null,
      theirs: voice ? voice.voice.seconds.theirs + voice.round.seconds.theirs : null,
      minTotal: 60,
    },
    { id: 'questions', unit: 'count', mine: habits?.questions.mine, theirs: habits?.questions.theirs, minTotal: 20 },
    { id: 'stickers', unit: 'count', mine: stickers?.count.mine, theirs: stickers?.count.theirs },
    {
      id: 'essays',
      unit: 'words',
      mine: vocabulary.wordsPerMessage.mine,
      theirs: vocabulary.wordsPerMessage.theirs,
      minTotal: 0,
    },
    { id: 'lastWord', unit: 'percent', mine: lastWord, theirs: lastWord == null ? null : 100 - lastWord, minTotal: 0 },
    { id: 'doubleTexts', unit: 'count', mine: habits?.doubleTexts.mine, theirs: habits?.doubleTexts.theirs },
  ]

  return candidates
    .flatMap((candidate): QuizQuestionDto[] => {
      const { mine, theirs } = candidate
      if (mine == null || theirs == null) return []
      const high = Math.max(mine, theirs)
      if (high <= 0 || mine === theirs || mine + theirs < (candidate.minTotal ?? 10)) return []
      if (Math.abs(mine - theirs) / high < MIN_LEAD) return []
      const mineWins = candidate.lowerWins ? mine < theirs : mine > theirs
      return [{ id: candidate.id, unit: candidate.unit, mine, theirs, answer: mineWins ? 'mine' : 'theirs' }]
    })
    .slice(0, QUIZ_LENGTH)
}

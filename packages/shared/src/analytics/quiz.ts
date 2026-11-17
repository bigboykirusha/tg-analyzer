import {
  MIN_REPORT_MESSAGES,
  type ChatReport,
  type QuizQuestionDto,
  type QuizQuestionId,
  type QuizUnit,
} from '../api/types'

/** The game asks this many questions at most (17.11: more questions, the owner asked). */
export const QUIZ_LENGTH = 10
/** Fewer messages make every answer a coin flip. */
const MIN_MESSAGES = MIN_REPORT_MESSAGES
const MIN_REPLIES = 10
/**
 * Only sides this close are a tie (17.11: a near call is still a question, «only if they are all but equal»). A
 * question whose two numbers would read the same on screen is a tie too, whatever the lead (see `shown`).
 */
const MIN_LEAD = 0.02

/**
 * A value as the screen prints it (useQuizText: whole percents, whole words, `formatDuration`): «2 мин» against
 * «2 мин» is no question, though 125 s and 120 s differ.
 */
function shown(unit: QuizUnit, value: number) {
  if (unit !== 'seconds') return Math.round(value)
  if (value < 60) return Math.max(1, Math.round(value))
  const days = Math.floor(value / 86_400)
  const hours = Math.floor((value % 86_400) / 3600)
  if (days) return `d${days}h${hours}`
  return `h${hours}m${Math.floor((value % 3600) / 60)}`
}

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
 * «Who more?» questions for a private chat, read from the stored report, so old reports get them too. They are
 * ordered so that neighbours differ: who starts, who is faster, who writes more, then the habits. Only real ties and
 * thin data are skipped. The «who was it» facts always get their places, spread among the numbers, and at most
 * {@link QUIZ_LENGTH} questions are returned.
 */
export function deriveQuiz(report: ChatReport): QuizQuestionDto[] {
  if (report.group || report.totals.messages < MIN_MESSAGES) return []
  const { responses, habits, vocabulary, voice, stickers, reactions, rituals } = report
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
    // By turn, as the report counts them (useMatch, useVersus): one chat, one answer to «who asks more».
    {
      id: 'questions',
      unit: 'count',
      mine: habits?.questionTurns?.mine,
      theirs: habits?.questionTurns?.theirs,
      minTotal: 20,
    },
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
    { id: 'reactions', unit: 'count', mine: reactions?.given.mine, theirs: reactions?.given.theirs, minTotal: 10 },
    {
      id: 'goodMorning',
      unit: 'count',
      mine: rituals?.goodMorning.mine,
      theirs: rituals?.goodMorning.theirs,
      minTotal: 6,
    },
  ]

  const numeric = candidates.flatMap((candidate): QuizQuestionDto[] => {
    const { mine, theirs } = candidate
    if (mine == null || theirs == null) return []
    const high = Math.max(mine, theirs)
    if (high <= 0 || mine === theirs || mine + theirs < (candidate.minTotal ?? 10)) return []
    if (Math.abs(mine - theirs) / high < MIN_LEAD) return []
    if (shown(candidate.unit, mine) === shown(candidate.unit, theirs)) return []
    const mineWins = candidate.lowerWins ? mine < theirs : mine > theirs
    return [{ id: candidate.id, unit: candidate.unit, mine, theirs, answer: mineWins ? 'mine' : 'theirs' }]
  })

  const facts = deriveFacts(report)
  const picked = numeric.slice(0, QUIZ_LENGTH - facts.length)
  // One fact after every few numbers, so the game changes its kind of question as it goes.
  const step = Math.max(1, Math.floor((picked.length + facts.length) / (facts.length + 1)))
  const quiz: QuizQuestionDto[] = []
  for (const question of picked) {
    quiz.push(question)
    if (facts.length && (quiz.length + 1) % (step + 1) === 0) quiz.push(facts.shift()!)
  }
  return [...quiz, ...facts]
}

const fact = (id: QuizQuestionId, mine: boolean): QuizQuestionDto => ({
  id,
  unit: 'fact',
  mine: mine ? 1 : 0,
  theirs: mine ? 0 : 1,
  answer: mine ? 'mine' : 'theirs',
})

/** Questions with one clear answer however even the chat is: who it was, not how much. */
function deriveFacts(report: ChatReport): QuizQuestionDto[] {
  const facts: QuizQuestionDto[] = []
  const first = report.milestones?.find((milestone) => milestone.index === 1)
  if (first) facts.push(fact('firstMessage', first.mine))
  const gap = report.facts.longestGap
  if (gap && gap.brokenByMe != null) facts.push(fact('pauseBreaker', gap.brokenByMe))
  const longest = report.voice?.voice.longest
  if (longest && report.voice!.voice.count.mine > 0 && report.voice!.voice.count.theirs > 0) {
    facts.push(fact('longestVoice', longest.mine))
  }
  return facts
}

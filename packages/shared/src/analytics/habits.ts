import type { ChatReport } from '../api/types'
import {
  MIN_CONVERSATIONS,
  MIN_GOOD_NIGHTS,
  MIN_HABIT_EVENTS,
  MIN_LAUGH_EVENTS,
  MIN_MORNINGS,
  MIN_QUESTION_EVENTS,
  MIN_RECORDINGS,
} from './significance'

/** A side leads when it does at least this many times more; closer pairs are «поровну». */
export const LEAD_RATIO = 1.25

/** No side leads: the report, «Итоги» and the link call the same pair even (one fact, one answer). */
export function isEven(mine: number, theirs: number) {
  const high = Math.max(mine, theirs)
  const low = Math.min(mine, theirs)
  return low > 0 ? high / low < LEAD_RATIO : high === 0
}

export type HabitId =
  'starts' | 'firstMorning' | 'laughs' | 'goodNight' | 'questions' | 'voice' | 'stickers' | 'reactions'

/** One «who does it more» line: only produced when a side leads by {@link LEAD_RATIO} or more. */
export interface HabitRow {
  id: HabitId
  /** Who does it more. */
  lead: 'mine' | 'theirs'
  mine: number
  theirs: number
  /** How many times more the leader does it, rounded to a tenth; null when the other side never does («только вы»). */
  ratio: number | null
  /** Both sides together. */
  total: number
  /** Voice and video notes only: the recorded time of both sides together, for «10 мин 29 с». */
  seconds?: number
}

export interface HabitsSummary {
  /** Lines with a leader, the most striking first. */
  leads: HabitRow[]
  /** Habits with enough data where nobody leads, in the report's order: one line, «Поровну: …». */
  even: HabitId[]
  /** Habits without enough data to say anything; never shown. */
  skipped: HabitId[]
  /** The most striking difference, the answer of the card; null when nobody leads in anything. */
  brightest: HabitRow | null
}

/** Order of the habits in a line and the tie-breaker of the ranking. */
const HABIT_ORDER: readonly HabitId[] = [
  'starts',
  'firstMorning',
  'laughs',
  'goodNight',
  'questions',
  'voice',
  'stickers',
  'reactions',
]

/** A pair where the other side does nothing ranks as this many times: huge, but below any real curiosity of one. */
const ONLY_ONE_SIDE_RANK = 10

interface Measure {
  mine: number
  theirs: number
  /** Both sides together must reach this, or the habit is skipped. */
  min: number
  seconds?: number
}

/**
 * The habits of a private chat as «who does it more» lines. A line appears only with a lead of
 * {@link LEAD_RATIO} or more and enough events ({@link MIN_HABIT_EVENTS} and the per-habit floors);
 * everything else with enough data goes to one «поровну» list. Groups get nothing.
 */
export function deriveHabits(report: ChatReport): HabitsSummary {
  const empty: HabitsSummary = { leads: [], even: [], skipped: [...HABIT_ORDER], brightest: null }
  if (report.group) return empty
  const measures = measure(report)
  const leads: HabitRow[] = []
  const even: HabitId[] = []
  const skipped: HabitId[] = []

  for (const id of HABIT_ORDER) {
    const item = measures[id]
    if (!item || item.mine + item.theirs < item.min) {
      skipped.push(id)
      continue
    }
    if (isEven(item.mine, item.theirs)) {
      even.push(id)
      continue
    }
    const lead = item.mine > item.theirs ? 'mine' : 'theirs'
    const high = Math.max(item.mine, item.theirs)
    const low = Math.min(item.mine, item.theirs)
    leads.push({
      id,
      lead,
      mine: item.mine,
      theirs: item.theirs,
      ratio: low > 0 ? Math.round((high / low) * 10) / 10 : null,
      total: item.mine + item.theirs,
      ...(item.seconds === undefined ? {} : { seconds: item.seconds }),
    })
  }

  const rank = (row: HabitRow) => row.ratio ?? ONLY_ONE_SIDE_RANK
  leads.sort(
    (left, right) =>
      rank(right) - rank(left) ||
      right.total - left.total ||
      HABIT_ORDER.indexOf(left.id) - HABIT_ORDER.indexOf(right.id),
  )
  return { leads, even, skipped, brightest: leads[0] ?? null }
}

function measure(report: ChatReport): Partial<Record<HabitId, Measure>> {
  const { habits, rituals, voice, stickers, reactions, responses, sessions } = report
  const result: Partial<Record<HabitId, Measure>> = {}

  const firstPct = responses.iWriteFirstPct
  if (firstPct !== null && firstPct !== undefined && sessions.totalSessions > 0) {
    const mine = Math.round((firstPct / 100) * sessions.totalSessions)
    result.starts = { mine, theirs: sessions.totalSessions - mine, min: MIN_CONVERSATIONS }
  }
  if (rituals) {
    result.firstMorning = { ...rituals.morningFirst, min: MIN_MORNINGS }
    result.goodNight = { ...rituals.goodNight, min: MIN_GOOD_NIGHTS }
  }
  if (habits) {
    result.laughs = { ...habits.laughs, min: MIN_LAUGH_EVENTS }
    result.questions = { ...habits.questions, min: MIN_QUESTION_EVENTS }
  }
  if (voice) {
    result.voice = {
      mine: voice.voice.count.mine + voice.round.count.mine,
      theirs: voice.voice.count.theirs + voice.round.count.theirs,
      min: MIN_RECORDINGS,
      seconds:
        voice.voice.seconds.mine + voice.voice.seconds.theirs + voice.round.seconds.mine + voice.round.seconds.theirs,
    }
  }
  if (stickers) result.stickers = { ...stickers.count, min: MIN_HABIT_EVENTS }
  if (reactions) result.reactions = { ...reactions.given, min: MIN_HABIT_EVENTS }
  return result
}

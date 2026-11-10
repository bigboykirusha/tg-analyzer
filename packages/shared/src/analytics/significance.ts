/**
 * How much data a finding needs before the report may say it. A card built on a handful of
 * repeats is a coin flip dressed as an insight («слово переписки: обсудить, 7 раз» in 130 messages).
 * All floors live here, so one rule serves the report, «Итоги» and the shared link.
 */

/**
 * The word of the chat must be written this many times at least, and in this share of the text
 * messages: 10 uses is the point where a word stops being a coincidence of a short chat, and the
 * share keeps the bar rising with the chat (a long chat's «top word» needs a real lead over noise).
 */
export const MIN_WORD_OF_CHAT_COUNT = 10
export const MIN_WORD_OF_CHAT_SHARE = 0.005

/**
 * A word that one side «owns», or both share, needs this many uses by that side (both together for
 * a shared one): below 4 a word is a one-off phrase, not a habit of speech.
 */
export const MIN_VOCABULARY_WORD_COUNT = 4
export const MIN_SHARED_WORD_COUNT = 6

/** An emoji, a reaction or a sticker is a favourite only after this many uses: two taps are not a taste. */
export const MIN_FAVOURITE_COUNT = 3

/**
 * Events of both sides together, below which «who does it more» is chance: with 10, a lead of
 * 1.25× needs 6 against 4, and a single event no longer swings the answer. Rarer things get
 * their own floor below.
 */
export const MIN_HABIT_EVENTS = 10
/** Questions and laughs are cheap to produce, so they need more (the same floor the quiz and insights use). */
export const MIN_QUESTION_EVENTS = 20
export const MIN_LAUGH_EVENTS = 20
/** Conversations a chat needs before «who starts them» says anything. */
export const MIN_CONVERSATIONS = 10
/** Answered mornings: they are rare by nature (the other side must answer within hours), so 6 is already a pattern. */
export const MIN_MORNINGS = 6
/** «Спокойной ночи» is said once a night at most; 6 wishes in the chat are enough to compare. */
export const MIN_GOOD_NIGHTS = 6
/** Voice messages and video notes: 5 recordings already show who prefers them. */
export const MIN_RECORDINGS = 5

/** The most common word is a finding only with enough weight behind it. */
export function wordOfChatThreshold(textMessages: number) {
  return Math.max(MIN_WORD_OF_CHAT_COUNT, Math.ceil(textMessages * MIN_WORD_OF_CHAT_SHARE))
}

export function isSignificantWordOfChat(count: number, textMessages: number) {
  return count >= wordOfChatThreshold(textMessages)
}

export function isSignificantFavourite(count: number) {
  return count >= MIN_FAVOURITE_COUNT
}

/** Drops items used fewer times than `min`; order and counts stay. */
export function withMinCount<T extends { count: number }>(items: readonly T[], min: number): T[] {
  return items.filter((item) => item.count >= min)
}

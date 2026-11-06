import type { TopItemDto } from '../api/types'

/** A private chat's words (or emoji) told once each: what you share, and what each side owns. */
export interface VocabularySplit {
  /** Used by both sides at a similar rate, by the count of both together. */
  shared: TopItemDto[]
  /** Your signature: words you use at least `lift` times as often as the other side. */
  mine: TopItemDto[]
  /** The other side's signature, by the same rule. */
  theirs: TopItemDto[]
}

export interface VocabularySplitOptions {
  /** Shared words to keep. */
  sharedLimit?: number
  /** Signature words to keep per side. */
  signatureLimit?: number
  /** How many times more often (relative to each side's own volume) a word must come up to be a signature. */
  lift?: number
  /** A signature word needs at least this many uses: one stray word says nothing. */
  minCount?: number
  /** The length the stored top lists are cut at: a word missing from a full list may still sit just under it. */
  listLimit?: number
  /** Words only one side ever used (`uniqueWordsBySender`), also candidates for the signatures. */
  exclusive?: { mine: readonly TopItemDto[]; theirs: readonly TopItemDto[] }
  /** Values that have a card of their own (the word of the chat) and are left out everywhere. */
  exclude?: Iterable<string>
}

const DEFAULTS = { sharedLimit: 10, signatureLimit: 8, lift: 2, minCount: 2, listLimit: 20 }

/**
 * Splits two «top N» lists into one shared vocabulary and two signatures, so a word lives in one
 * place only. Rates are counted against each side's own top list, so a side that writes more does
 * not own every word. A word missing from the other side's full list is counted at that list's
 * smallest count, the most it could have: a signature is never claimed on a word that may just
 * have been cut off.
 */
export function splitVocabulary(
  mine: readonly TopItemDto[],
  theirs: readonly TopItemDto[],
  options: VocabularySplitOptions = {},
): VocabularySplit {
  const { sharedLimit, signatureLimit, lift, minCount, listLimit } = { ...DEFAULTS, ...options }
  const exclude = new Set(options.exclude ?? [])
  const lists = { mine, theirs }
  const maps = { mine: toMap(mine), theirs: toMap(theirs) }
  const exclusive = {
    mine: toMap(options.exclusive?.mine ?? []),
    theirs: toMap(options.exclusive?.theirs ?? []),
  }
  const totals = { mine: sum(mine), theirs: sum(theirs) }
  /** The most a word missing from this side's list could have been used. */
  const ceiling = (side: Side) =>
    lists[side].length >= listLimit ? Math.min(...lists[side].map((item) => item.count)) : 0

  const shared: TopItemDto[] = []
  const signatures: Record<Side, TopItemDto[]> = { mine: [], theirs: [] }
  const words = new Set([
    ...maps.mine.keys(),
    ...maps.theirs.keys(),
    ...exclusive.mine.keys(),
    ...exclusive.theirs.keys(),
  ])

  for (const word of words) {
    if (exclude.has(word)) continue
    const count = (side: Side, other: Side) =>
      maps[side].get(word) ?? exclusive[side].get(word) ?? (exclusive[other].has(word) ? 0 : ceiling(side))
    const counts = { mine: count('mine', 'theirs'), theirs: count('theirs', 'mine') }
    const rate = (side: Side) => (totals[side] ? counts[side] / totals[side] : 0)
    const known = (side: Side) => maps[side].has(word) || exclusive[side].has(word)

    let owner: Side | null = null
    for (const [side, other] of [
      ['mine', 'theirs'],
      ['theirs', 'mine'],
    ] as const)
      if (known(side) && counts[side] >= minCount && rate(side) >= lift * rate(other)) owner = side
    if (owner) signatures[owner].push({ value: word, count: counts[owner] })
    else if (maps.mine.has(word) && maps.theirs.has(word))
      shared.push({ value: word, count: counts.mine + counts.theirs })
  }

  return {
    shared: sorted(shared).slice(0, sharedLimit),
    mine: sorted(signatures.mine).slice(0, signatureLimit),
    theirs: sorted(signatures.theirs).slice(0, signatureLimit),
  }
}

type Side = 'mine' | 'theirs'

function toMap(items: readonly TopItemDto[]) {
  return new Map(items.map((item) => [item.value, item.count]))
}

function sum(items: readonly TopItemDto[]) {
  return items.reduce((total, item) => total + item.count, 0)
}

function sorted(items: TopItemDto[]) {
  return items.sort((left, right) => right.count - left.count || left.value.localeCompare(right.value))
}

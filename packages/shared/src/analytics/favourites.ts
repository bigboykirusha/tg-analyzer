import type { ChatReport, DerivedFavourites, TopItemDto } from '../api/types'
import { isSignificantFavourite, MIN_FAVOURITE_COUNT, withMinCount } from './significance'

/** Emoji in the overall line of «Эмодзи и реакции». */
const TOP_EMOJI = 8
/** Reactions that are not an emoji: they have no picture to show. */
const NOT_SHOWABLE = new Set(['custom', 'paid'])

const first = (items: readonly TopItemDto[]): TopItemDto | null => {
  const top = items[0]
  return top && isSignificantFavourite(top.count) ? top : null
}

/**
 * «Любимое» of each side: emoji, reaction, sticker, each only when used often enough to be a
 * taste ({@link isSignificantFavourite}). A side without enough data gets null, not a weak guess.
 */
export function deriveFavourites(report: ChatReport): DerivedFavourites {
  const { vocabulary, reactions, stickers } = report
  const reaction = (items: readonly TopItemDto[]) => first(items.filter((item) => !NOT_SHOWABLE.has(item.value)))
  const sticker = (side: 'mine' | 'theirs') => {
    const best = (stickers?.top ?? [])
      .filter((item) => item.emoji && isSignificantFavourite(item[side]))
      .sort((left, right) => right[side] - left[side] || left.id.localeCompare(right.id))[0]
    return best ? { id: best.id, emoji: best.emoji, count: best[side] } : null
  }
  return {
    topEmoji: withMinCount(vocabulary.topEmoji, MIN_FAVOURITE_COUNT).slice(0, TOP_EMOJI),
    emoji: { mine: first(vocabulary.topEmojiBySender.mine), theirs: first(vocabulary.topEmojiBySender.theirs) },
    reaction: {
      mine: reaction(reactions?.topBySender.mine ?? []),
      theirs: reaction(reactions?.topBySender.theirs ?? []),
    },
    sticker: { mine: sticker('mine'), theirs: sticker('theirs') },
  }
}

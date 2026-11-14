import type { ReportDto } from '@tg-analyzer/shared'

/**
 * The favourite emoji: one sentence (each side's own, or the chat's most frequent) and the chat's top emoji.
 * `derived.favourites` keeps only what was used often enough to be a taste. The report card and the «Итоги»
 * frame read the same answer.
 */
export function useFavouriteEmoji(data: () => ReportDto) {
  const { t } = useI18n()
  const you = useYouLabel()

  const favourites = computed(() => data().derived.favourites)
  const top = computed(() => favourites.value.topEmoji)
  const answer = computed(() => {
    const { emoji, topEmoji } = favourites.value
    // A group says it as its own card does (`GroupWords`): the chat's most frequent emoji, never «both of you».
    if (data().report.group) return topEmoji[0] ? t('group.favouriteEmoji', { emoji: topEmoji[0].value }) : null
    const mine = emoji.mine?.value
    const theirs = emoji.theirs?.value
    const name = data().summary.title
    if (mine && theirs)
      return mine === theirs
        ? t('report.favourites.same', { emoji: mine })
        : t('report.favourites.both', { me: you.value, mine, name, theirs })
    if (mine || theirs) return t('report.favourites.one', { who: mine ? you.value : name, emoji: (mine ?? theirs)! })
    const first = topEmoji[0]
    return first ? t('report.favourites.top', { emoji: first.value }) : null
  })

  return { answer, top }
}

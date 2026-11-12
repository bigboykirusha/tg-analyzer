import { fillDailyGaps, type ReportDto } from '@tg-analyzer/shared'
import { parseWindow } from '../lib/persona'
import type { MessageKey } from './useI18n'

/** Who a frame is about: the two of you, or a group. */
export interface StoryWho {
  /** The group or the other person: their avatar seed and name. */
  chatId: string
  name: string
  /** Null in a group. */
  me: { name: string; initial: string } | null
  label: string
}

/**
 * One frame is one finding, said the way its report card says it: `label` is the card's name, `figure`
 * its one big number or word (when it has one), `title` the answer in a few words.
 */
interface FrameBase {
  key: string
  /** The card's name: in the frame, in the bar and in the picture's file name. */
  label: string
  figure?: string
  title: string
  sub?: string
}

export type StoryFrameModel =
  | (FrameBase & { kind: 'cover'; days: { sent: number; received: number }[]; meta: string })
  | (FrameBase & {
      kind: 'balance'
      /** Your share of the messages, 0–100; the rest is the other side's. */
      share: number
      rows: { key: string; label: string; mine: number; theirs: number; left: string; right: string }[]
    })
  | (FrameBase & {
      kind: 'time'
      /** 24 values, 0–1: how busy each hour is next to the busiest. */
      hours: number[]
      peak: number[]
    })
  | (FrameBase & {
      kind: 'words'
      /** One or two groups of chips: yours and theirs, or the shared words. */
      sides: { key: string; label: string | null; items: string[] }[]
      emoji: { value: string; count: string }[]
    })
  | (FrameBase & {
      kind: 'people'
      members: { id: string; name: string; share: string; role: string; self: boolean }[]
    })

/**
 * «Итоги» as data: the frames are the conclusions of the report's cards, with their words and numbers.
 * A private chat has four (the cover, «Баланс», «Время», «Слова»), a group four of its own (the cover,
 * «Люди», «Время», «Слова»). Each number comes from the same derived fields the card reads, the words
 * from `derived.words`, so a frame never says what the report does not.
 */
export function useStoryFrames(data: () => ReportDto) {
  const { t, tc, formatNumber, formatPercent, formatDay, quote } = useI18n()
  const auth = useAuthStore()
  const nameOf = useParticipantName()

  const report = computed(() => data().report)
  const isGroup = computed(() => Boolean(report.value.group))
  const name = computed(() => data().summary.title)
  const days = computed(() => fillDailyGaps(report.value.activity.daily))
  const balanceFacts = useBalance(data)
  const wordFacts = useWordsFacts(data, { limit: 4 })
  const plain = (text: string) => text.replace(/\s?г\.$/u, '')

  const who = computed<StoryWho>(() => {
    const mine = auth.user?.firstName?.trim() || auth.user?.username || ''
    return {
      chatId: data().summary.chatId,
      name: name.value,
      me: isGroup.value ? null : { name: mine || t('story.you'), initial: mine.charAt(0).toLocaleUpperCase() },
      label: isGroup.value ? name.value : t('story.pair', { name: name.value }),
    }
  })

  function cover(): StoryFrameModel {
    const first = days.value[0]?.date
    const last = days.value.at(-1)?.date
    return {
      kind: 'cover',
      key: 'cover',
      label: t('story.label.cover'),
      title: name.value,
      sub: t('share.coverMeta', {
        messages: tc('common.messagesCount', report.value.totals.messages),
        days: tc('insight.days', days.value.length),
      }),
      meta:
        first && last
          ? t('story.period', {
              from: plain(formatDay(first, { day: 'numeric', month: 'long' })),
              to: plain(formatDay(last, { day: 'numeric', month: 'long', year: 'numeric' })),
            })
          : '',
      days: days.value,
    }
  }

  /** «Баланс»: the card's answer and figure, the same three rows (`useBalance`). */
  function balance(): StoryFrameModel | null {
    if (!balanceFacts.answer.value) return null
    return {
      kind: 'balance',
      key: 'balance',
      label: t('report.balance.title'),
      figure: balanceFacts.figure.value ?? undefined,
      title: balanceFacts.answer.value,
      share: balanceFacts.share.value,
      rows: balanceFacts.rows.value,
    }
  }

  /** «Время»: the chat's usual window, private or group — as on the card. */
  function time(): StoryFrameModel | null {
    const hourly = report.value.activity.hourly
    const totals = Array.from({ length: 24 }, (_, hour) => hourly[hour]?.total ?? 0)
    const top = Math.max(1, ...totals)
    const window = parseWindow(data().derived.availabilityProfile.peakWindow)
    if (!window) return null
    const title = t('report.time.peak', { from: window.from, to: window.to }).replace(/–/gu, '⁠–⁠')
    const peak = Array.from({ length: window.length }, (_, index) => (window.start + index) % 24)
    return {
      kind: 'time',
      key: 'time',
      label: t('report.time.title'),
      title,
      hours: totals.map((value) => value / top),
      peak,
    }
  }

  /** «Слова»: the word of the chat, then the words of each side. */
  function words(): StoryFrameModel | null {
    const clean = data().derived.words
    const emoji = data()
      .derived.favourites.topEmoji.slice(0, 5)
      .map((item) => ({ value: item.value, count: formatNumber(item.count) }))
    if (isGroup.value) {
      const shared = clean.group?.shared ?? []
      const first = shared[0]
      if (!first && !emoji.length) return null
      return {
        kind: 'words',
        key: 'words',
        label: t('group.wordsTitle'),
        figure: first ? quote(first.value) : undefined,
        title: first ? tc('report.words.word', first.count) : t('group.favouriteEmoji', { emoji: emoji[0]!.value }),
        sides: [{ key: 'shared', label: null, items: shared.slice(1, 7).map((item) => item.value) }],
        emoji,
      }
    }
    const { mine, theirs, figure, answer, any } = wordFacts
    if (!any.value) return null
    return {
      kind: 'words',
      key: 'words',
      label: t('report.words.card'),
      figure: figure.value ?? undefined,
      title: answer.value,
      sides: [
        { key: 'mine', label: t('report.words.mine'), items: mine.value.map((item) => item.value) },
        { key: 'theirs', label: name.value, items: theirs.value.map((item) => item.value) },
      ].filter((side) => side.items.length),
      emoji: [],
    }
  }

  function people(): StoryFrameModel | null {
    const group = report.value.group
    if (!group) return null
    const ranked = [...group.participants].sort(
      (a, b) => Number(b.isSelf) - Number(a.isSelf) || b.messageCount - a.messageCount,
    )
    const core = group.participants.filter((person) => person.role === 'anchor').length
    return {
      kind: 'people',
      key: 'people',
      label: t('group.tabs.people'),
      title: core ? tc('group.core', core) : t('group.coreNone'),
      members: ranked.slice(0, 4).map((person) => ({
        id: person.id,
        name: nameOf(person),
        share: formatPercent(person.messageShare),
        role: t(`group.roles.${person.role}` as MessageKey),
        self: person.isSelf,
      })),
    }
  }

  const frames = computed(() =>
    (isGroup.value ? [cover(), people(), time(), words()] : [cover(), balance(), time(), words()]).filter(
      (frame): frame is StoryFrameModel => frame !== null,
    ),
  )

  return { frames, who }
}

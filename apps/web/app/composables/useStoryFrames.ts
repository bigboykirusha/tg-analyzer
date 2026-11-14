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
  | (FrameBase & { kind: 'cover'; days: { sent: number; received: number }[] })
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
  | (FrameBase & { kind: 'streak' })
  | (FrameBase & { kind: 'record' })
  | (FrameBase & { kind: 'emoji'; emoji: { value: string; count: string }[] })
  | (FrameBase & {
      /** «Всё вместе»: the facts the earlier frames said, each a value under its name. */
      kind: 'summary'
      facts: { key: string; label: string; value: string }[]
    })
  | (FrameBase & {
      kind: 'people'
      members: { id: string; name: string; share: string; role: string; self: boolean }[]
    })

/**
 * «Итоги» as data: the frames are the conclusions of the report's cards, with their words and numbers.
 * A private chat has eight (the cover, «Баланс», «Дней подряд», «Время», the longest conversation, «Слова»,
 * the favourite emoji, «Всё вместе»), a group six (the cover, «Люди», «Время», «Слова», the emoji, «Всё вместе»);
 * a frame is left out when its card would not show. Each number comes from the same derived fields the card reads, the words
 * from `derived.words`, so a frame never says what the report does not.
 */
export function useStoryFrames(data: () => ReportDto) {
  const { t, tc, formatNumber, formatPercent, quote } = useI18n()
  const auth = useAuthStore()
  const nameOf = useParticipantName()

  const report = computed(() => data().report)
  const isGroup = computed(() => Boolean(report.value.group))
  const name = computed(() => data().summary.title)
  const days = computed(() => fillDailyGaps(report.value.activity.daily))
  const balanceFacts = useBalance(data)
  const wordFacts = useWordsFacts(data, { limit: 4 })
  const span = useChatSpan()
  const streakRun = useStreak(data, () => !isGroup.value)
  const recordFacts = useRecords(data)
  const emojiFacts = useFavouriteEmoji(data)

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
    return {
      kind: 'cover',
      key: 'cover',
      label: t('story.label.cover'),
      title: name.value,
      sub: span(data()),
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
    if (isGroup.value) {
      const shared = clean.group?.shared ?? []
      const first = shared[0]
      if (!first) return null
      return {
        kind: 'words',
        key: 'words',
        label: t('group.wordsTitle'),
        figure: quote(first.value),
        title: tc('report.words.word', first.count),
        sides: [{ key: 'shared', label: null, items: shared.slice(1, 7).map((item) => item.value) }],
        emoji: [],
      }
    }
    const { mine, theirs, next, figure, answer, any } = wordFacts
    if (!any.value) return null
    const sides: { key: string; label: string | null; items: string[] }[] = [
      { key: 'mine', label: t('report.words.mine'), items: mine.value.map((item) => item.value) },
      { key: 'theirs', label: name.value, items: theirs.value.map((item) => item.value) },
      { key: 'next', label: t('report.topWords.title'), items: next.value.map((item) => item.value) },
    ].filter((side) => side.items.length)
    return {
      kind: 'words',
      key: 'words',
      label: t('report.words.card'),
      figure: figure.value ?? undefined,
      title: answer.value,
      sides,
      emoji: [],
    }
  }

  /** «Дней подряд»: the calendar poster's run, the same function (`useStreak`). */
  function streak(): StoryFrameModel | null {
    const run = streakRun.value
    if (!run) return null
    return { kind: 'streak', key: 'streak', label: t('report.main.streakTitle'), figure: run.figure, title: run.answer }
  }

  /** The first record of «Ваши рекорды» — normally the longest conversation — with its date. */
  function record(): StoryFrameModel | null {
    const first = recordFacts.facts.value[0]
    if (!first) return null
    return {
      kind: 'record',
      key: 'record',
      label: first.label,
      figure: first.value,
      title: first.sub || first.label,
    }
  }

  /** The favourite emoji: the card's answer, the top emoji with their counts. */
  function emoji(): StoryFrameModel | null {
    const top = emojiFacts.top.value[0]
    const answer = emojiFacts.answer.value
    if (!top || !answer) return null
    return {
      kind: 'emoji',
      key: 'emoji',
      label: t('report.favourites.titleLean'),
      figure: top.value,
      title: answer,
      emoji: emojiFacts.top.value.slice(0, 5).map((item) => ({ value: item.value, count: formatNumber(item.count) })),
    }
  }

  /** «Всё вместе»: up to six facts the earlier frames said, only those whose frame exists. */
  function summary(said: (StoryFrameModel | null)[]): StoryFrameModel | null {
    const has = (kind: StoryFrameModel['kind']) => said.some((frame) => frame?.kind === kind)
    const facts: { key: string; label: string; value: string }[] = []
    facts.push({
      key: 'messages',
      label: t('story.summary.messages'),
      value: formatNumber(report.value.totals.messages),
    })
    if (isGroup.value) {
      const members = report.value.group?.participants.length
      if (members) facts.push({ key: 'members', label: t('story.summary.members'), value: formatNumber(members) })
    } else if (has('balance') && balanceFacts.figure.value)
      facts.push({ key: 'balance', label: t('report.balance.title'), value: balanceFacts.figure.value })
    const run = streakRun.value
    if (has('streak') && run) facts.push({ key: 'streak', label: t('report.main.streakTitle'), value: run.figure })
    const window = parseWindow(data().derived.availabilityProfile.peakWindow)
    if (has('time') && window)
      facts.push({ key: 'peak', label: t('story.summary.peak'), value: `${window.from}⁠–⁠${window.to}` })
    const word = isGroup.value ? data().derived.words.group?.shared[0] : wordFacts.word.value
    if (has('words') && word) facts.push({ key: 'word', label: t('story.summary.word'), value: quote(word.value) })
    const top = emojiFacts.top.value[0]
    if (has('emoji') && top) facts.push({ key: 'emoji', label: t('story.summary.emoji'), value: top.value })
    if (facts.length < 2) return null
    return {
      kind: 'summary',
      key: 'summary',
      label: t('story.label.summary'),
      title: who.value.label,
      facts: facts.slice(0, 6),
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

  const frames = computed(() => {
    const lead = isGroup.value
      ? [cover(), people(), time(), words(), emoji()]
      : [cover(), balance(), streak(), time(), record(), words(), emoji()]
    return [...lead, summary(lead)].filter((frame): frame is StoryFrameModel => frame !== null)
  })

  return { frames, who }
}

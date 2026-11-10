import { fillDailyGaps, type ReportDto } from '@tg-analyzer/shared'
import { parseWindow, personaOf } from '../lib/persona'
import { maskSwear } from '../lib/profanity'
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

/** One line under a frame's picture; `[[…]]` marks the part said in ink. */
export type StoryLine = string

interface FrameBase {
  key: string
  /** «Вы двое»: the frame's name in the bar and in the picture's file name. */
  label: string
  title: string
  sub?: string
  lines: StoryLine[]
}

export type StoryFrameModel =
  | (FrameBase & { kind: 'cover'; days: { sent: number; received: number }[]; meta: string })
  | (FrameBase & { kind: 'together'; bubbles: { side: 'mine' | 'theirs'; text: string }[] })
  | (FrameBase & {
      kind: 'time'
      /** 24 values, 0–1: how busy each hour is next to the busiest. */
      hours: number[]
      peak: number[]
      window: string
      caption: string
      parts: { key: string; text: string; on: boolean }[]
    })
  | (FrameBase & {
      kind: 'words'
      list: { place: number; word: string; count: string }[]
      emoji: { value: string; count: string }[]
    })
  | (FrameBase & {
      kind: 'people'
      members: { id: string; name: string; share: string; role: string; self: boolean }[]
    })

const PARTS = [
  { key: 'night', label: 'story.part.night' },
  { key: 'morning', label: 'story.part.morning' },
  { key: 'afternoon', label: 'story.part.day' },
  { key: 'evening', label: 'story.part.evening' },
] as const

/**
 * «Итоги» as data: the frames of a report, each one finding with a picture of its own and a couple of
 * lines under it. A private chat has four (the cover, «Вы двое», «Ваше время», «О чём»), a group four of
 * its own (the cover, «Люди», «Время», «О чём»). Every number is the report's: the same `useVersus`,
 * `peakWindow` and top words the cards use, so a frame never says something the report does not.
 */
export function useStoryFrames(data: () => ReportDto) {
  const { t, tc, formatNumber, formatPercent, formatDuration, formatDay } = useI18n()
  const auth = useAuthStore()
  const nameOf = useParticipantName()
  const versus = useVersus(data)

  const report = computed(() => data().report)
  const isGroup = computed(() => Boolean(report.value.group))
  const name = computed(() => data().summary.title)
  const days = computed(() => fillDailyGaps(report.value.activity.daily))
  const day = (value: string | null | undefined) =>
    value ? formatDay(value.slice(0, 10), { day: 'numeric', month: 'long' }) : ''
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
    const { totals, facts, voice, sessions, group } = report.value
    const first = days.value[0]?.date
    const last = days.value.at(-1)?.date
    const lines: StoryLine[] = []
    if (facts.mostActiveDate) lines.push(t('story.line.loudest', { date: day(facts.mostActiveDate.date) }))
    const voiceSeconds = voice
      ? voice.voice.seconds.mine + voice.voice.seconds.theirs + voice.round.seconds.mine + voice.round.seconds.theirs
      : 0
    if (group) lines.push(t('story.line.members', { count: tc('report.poster.members', group.participants.length) }))
    else if (voiceSeconds >= 60) lines.push(t('story.line.voice', { time: formatDuration(voiceSeconds) }))
    else if (sessions.highlights[0])
      lines.push(t('story.line.longest', { time: formatDuration(sessions.highlights[0].durationSec) }))
    return {
      kind: 'cover',
      key: 'cover',
      label: t('story.label.cover'),
      title: name.value,
      sub: t('share.coverMeta', {
        messages: tc('common.messagesCount', totals.messages),
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
      lines,
    }
  }

  function together(): StoryFrameModel | null {
    const { totals, rituals, responses } = report.value
    if (!totals.messages) return null
    const share = Math.round((totals.sent / totals.messages) * 100)
    const title =
      share > 55
        ? t('story.together.mine')
        : share < 45
          ? t('story.together.theirs', { name: name.value })
          : t('story.together.even')
    const bubbles: { side: 'mine' | 'theirs'; text: string }[] = [
      {
        side: 'theirs',
        text: t('story.bubble.count', {
          messages: tc('common.messagesCount', totals.received),
          share: formatPercent(100 - share),
        }),
      },
      {
        side: 'mine',
        text: t('story.bubble.count', {
          messages: tc('common.messagesCount', totals.sent),
          share: formatPercent(share),
        }),
      },
    ]
    // A greeting goes to the side that says it more, as a bubble of its own.
    const ritual = (count: { mine: number; theirs: number } | undefined, key: MessageKey) => {
      if (!count || count.mine + count.theirs < 5) return
      const side = count.mine > count.theirs ? 'mine' : 'theirs'
      bubbles.push({ side, text: t(key, { times: tc('report.habits.times', Math.max(count.mine, count.theirs)) }) })
    }
    ritual(rituals?.goodNight, 'story.bubble.night')
    ritual(rituals?.goodMorning, 'story.bubble.morning')

    const lines: StoryLine[] = []
    const speed = versus.value.speed
    if (speed && responses.medianMineSec !== null && responses.medianTheirsSec !== null)
      lines.push(
        speed.lead === 'mine'
          ? t('story.line.fasterMine', { note: speed.note })
          : speed.lead === 'theirs'
            ? t('story.line.fasterTheirs', { name: name.value, note: speed.note })
            : t('story.line.speedEven', {
                time: formatDuration(Math.max(responses.medianMineSec, responses.medianTheirsSec)),
              }),
      )
    const starts = versus.value.starts
    if (starts)
      lines.push(
        starts.lead === 'mine'
          ? t('story.line.startsMine')
          : starts.lead === 'theirs'
            ? t('story.line.startsTheirs', { name: name.value })
            : t('story.line.startsEven'),
      )
    return { kind: 'together', key: 'together', label: t('report.tabs.together'), title, bubbles, lines }
  }

  function time(): StoryFrameModel | null {
    const peakWindow = data().derived.availabilityProfile.peakWindow
    const window = parseWindow(peakWindow)
    const persona = personaOf(peakWindow)
    if (!window || !persona) return null
    const totals = Array.from({ length: 24 }, (_, hour) => report.value.activity.hourly[hour]?.total ?? 0)
    const top = Math.max(1, ...totals)
    const distribution = data().derived.activityDistribution
    const sum = PARTS.reduce((acc, part) => acc + distribution[part.key].total, 0) || 1
    // The three busiest parts of the day, in the order of the day; the one of the peak is lit.
    const parts = PARTS.map((part) => ({ ...part, share: (distribution[part.key].total / sum) * 100 }))
      .sort((a, b) => b.share - a.share)
      .slice(0, 3)
      .sort((a, b) => PARTS.findIndex((p) => p.key === a.key) - PARTS.findIndex((p) => p.key === b.key))
      .map((part) => ({
        key: part.key,
        text: `${formatPercent(part.share)} ${t(part.label)}`,
        on: part.key === (persona === 'day' ? 'afternoon' : persona),
      }))
    const short = (value: string) => String(Number.parseInt(value, 10))
    const active = days.value.filter((item) => item.total > 0).length
    const lines: StoryLine[] = []
    if (days.value.length)
      lines.push(t('story.line.days', { active: tc('insight.days', active), total: formatNumber(days.value.length) }))
    const session = report.value.sessions.highlights[0]
    if (session) lines.push(t('story.line.longest', { time: formatDuration(session.durationSec) }))
    return {
      kind: 'time',
      key: 'time',
      label: isGroup.value ? t('report.tabs.time') : t('report.fmt.clockTitle'),
      title: t(`story.when.${persona}` as MessageKey),
      sub: t(isGroup.value ? 'story.time.subGroup' : 'story.time.sub', {
        from: short(window.from),
        to: short(window.to),
      }),
      hours: totals.map((value) => value / top),
      peak: Array.from({ length: window.length }, (_, index) => (window.start + index) % 24),
      window: `${short(window.from)}–${short(window.to)}`,
      caption: t(isGroup.value ? 'story.time.captionGroup' : 'story.time.caption'),
      parts,
      lines,
    }
  }

  function words(): StoryFrameModel | null {
    const { vocabulary, group } = report.value
    const top = (group ? group.sharedVocabulary : vocabulary.topWords).slice(0, 5)
    const first = top[0]
    if (!first) return null
    const lines: StoryLine[] = []
    if (!group) {
      const mine = vocabulary.uniqueWordsBySender.mine[0]?.value ?? vocabulary.topWordsBySender.mine[0]?.value
      const theirs = vocabulary.uniqueWordsBySender.theirs[0]?.value ?? vocabulary.topWordsBySender.theirs[0]?.value
      if (mine && theirs && mine !== theirs)
        lines.push(t('story.line.words', { mine: maskSwear(mine), theirs: maskSwear(theirs), name: name.value }))
    }
    return {
      kind: 'words',
      key: 'words',
      label: t('report.tabs.words'),
      title: maskSwear(first.value),
      sub: t(group ? 'story.words.subGroup' : 'story.words.sub', { times: tc('report.habits.times', first.count) }),
      list: top.slice(1).map((item, index) => ({
        place: index + 2,
        word: maskSwear(item.value),
        count: formatNumber(item.count),
      })),
      emoji: vocabulary.topEmoji.slice(0, 3).map((item) => ({ value: item.value, count: formatNumber(item.count) })),
      lines,
    }
  }

  function people(): StoryFrameModel | null {
    const group = report.value.group
    if (!group) return null
    const ranked = [...group.participants].sort((a, b) => b.messageCount - a.messageCount)
    const core = group.participants.filter((person) => person.role === 'anchor').length
    const starter = [...group.participants].sort((a, b) => b.starterShare - a.starterShare)[0]
    return {
      kind: 'people',
      key: 'people',
      label: t('group.tabs.people'),
      title: t('story.people.title'),
      sub: core
        ? t('story.people.sub', {
            people: tc('story.people.count', group.participants.length),
            core: formatNumber(core),
          })
        : tc('story.people.count', group.participants.length),
      members: ranked.slice(0, 4).map((person) => ({
        id: person.id,
        name: nameOf(person),
        share: formatPercent(person.messageShare),
        role: t(`group.roles.${person.role}` as MessageKey),
        self: person.isSelf,
      })),
      lines: starter && starter.starterShare > 0 ? [t('story.line.starter', { name: nameOf(starter) })] : [],
    }
  }

  const frames = computed(() =>
    (isGroup.value ? [cover(), people(), time(), words()] : [cover(), together(), time(), words()]).filter(
      (frame): frame is StoryFrameModel => frame !== null,
    ),
  )

  return { frames, who }
}

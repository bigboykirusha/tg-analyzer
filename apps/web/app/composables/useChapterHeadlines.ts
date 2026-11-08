import type { ReportDto } from '@tg-analyzer/shared'
import { personaOf, parseWindow } from '../lib/persona'

/** One chapter of the report: its anchor (`#part-<id>`), its name and its answer in one sentence. */
export interface ChapterHeadline {
  id: string
  label: string
  text: string | null
}

/** «пишете на равных», «Мила пишет больше»…: who writes more, in words, from the share of your messages. */
export function useShareVerdict(data: () => ReportDto) {
  const { t } = useI18n()
  return computed(() => {
    const totals = data().report.totals
    if (!totals.messages) return null
    const share = (totals.sent / totals.messages) * 100
    const name = data().summary.title
    if (share >= 65) return t('report.kpi.youWriteMuchMore')
    if (share > 55) return t('report.kpi.youWriteMore')
    if (share <= 35) return t('report.kpi.theyWriteMuchMore', { name })
    if (share < 45) return t('report.kpi.theyWriteMore', { name })
    return t('report.kpi.even')
  })
}

const capital = (value: string) => value.replace(/^./u, (letter) => letter.toLocaleUpperCase())

/**
 * The answer of every chapter, overview first: «Главное о вас двоих» under the poster, the line under
 * each chapter's title and the chapter list in the header all read it here, from the same pieces the
 * cards answer with (who writes more, `useVersus` speed, `lib/persona`, the word of the chat) — so a
 * chapter never says something its cards contradict.
 */
export function useChapterHeadlines(data: () => ReportDto, options: { noWords?: () => boolean } = {}) {
  const { t, formatPercent } = useI18n()
  const versus = useVersus(data)
  const verdict = useShareVerdict(data)
  const nameOf = useParticipantName()

  /** «Ночные совы: чаще всего с 22:00 до 01:00». */
  const time = computed(() => {
    const peak = data().derived.availabilityProfile.peakWindow
    const persona = personaOf(peak)
    const window = parseWindow(peak)
    if (!persona || !window) return null
    return t('report.headline.time', {
      persona: t(`story.persona.${persona}`),
      from: window.from,
      to: window.to,
    }).replace(/–/gu, '⁠–⁠')
  })

  const together = computed(() => {
    const share = verdict.value
    const speed = versus.value.speed
    if (!share) return null
    const pace = speed
      ? speed.lead === 'mine'
        ? t('report.headline.speedMine', { note: speed.note })
        : speed.lead === 'theirs'
          ? t('report.headline.speedTheirs', { name: data().summary.title, note: speed.note })
          : t('report.headline.speedEven')
      : null
    return capital(pace ? `${share}, ${pace}` : share)
  })

  const words = computed(() => {
    const word = data().report.vocabulary.topWords[0]
    return word ? t('report.headline.words', { word: word.value }) : null
  })

  const group = computed(() => data().report.group)

  /** «Разговор держат Дима и Аня: половина всех сообщений» — the fewest people who write half the chat. */
  const people = computed(() => {
    const participants = [...(group.value?.participants ?? [])].sort((a, b) => b.messageCount - a.messageCount)
    if (participants.length < 2) return null
    let share = 0
    const core = []
    for (const participant of participants) {
      core.push(nameOf(participant))
      share += participant.messageShare
      if (share >= 50) break
    }
    if (core.length > 3) return t('report.headline.peopleEven')
    if (core.length === 1) return t('report.headline.peopleOne', { name: core[0]!, share: formatPercent(share) })
    return t('report.headline.peopleCore', { names: core.join(t('report.headline.and')) })
  })

  const pairNames = usePairNames(() => group.value!)
  const talk = computed(() => {
    const pair = group.value?.topPairs[0]
    if (!pair) return null
    return t('report.headline.pair', {
      left: pairNames(pair.leftParticipantId, pair.leftParticipantName),
      right: pairNames(pair.rightParticipantId, pair.rightParticipantName),
    })
  })

  return computed<ChapterHeadline[]>(() =>
    data().summary.type === 'group'
      ? [
          { id: 'people', label: t('group.tabs.people'), text: people.value },
          { id: 'talk', label: t('group.tabs.talk'), text: talk.value },
          { id: 'time', label: t('report.tabs.time'), text: time.value },
        ]
      : [
          { id: 'together', label: t('report.tabs.together'), text: together.value },
          { id: 'time', label: t('report.tabs.time'), text: time.value },
          ...(options.noWords?.() ? [] : [{ id: 'words', label: t('report.tabs.words'), text: words.value }]),
        ],
  )
}

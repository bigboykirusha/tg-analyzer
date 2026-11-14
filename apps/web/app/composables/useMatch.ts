import { isEven, type ReportDto } from '@tg-analyzer/shared'

export interface Row {
  key: string
  label: string
  mine: string
  theirs: string
  /** Each side's share of the bar, 0–100; for reply time the faster side gets the longer bar. */
  shareMine: number
  lead: 'mine' | 'theirs' | null
  /** Whether a bigger value is a merit; «more unanswered questions» or «more double texts» score no point. */
  scored: boolean
}

/**
 * «Кто кого»: every comparison of the two sides as rows, the scoreboard of who leads how many, and the sheet's
 * answer. The card (`ReportMatch`) and the verdict under the poster (`ReportHighlights`) both read this one
 * function, so the answer is the same in both. A row with too few events behind it is left out.
 */
export function useMatch(data: () => ReportDto) {
  const { t, formatNumber, formatPercent, formatDuration } = useI18n()
  const versus = useVersus(data)
  const name = computed(() => data().summary.title)

  /** Fewer events than this on both sides together is noise. */
  const MIN = 5

  function row(
    key: string,
    label: string,
    mine: number,
    theirs: number,
    format: typeof formatNumber = formatNumber,
    faster = false,
    scored = true,
  ): Row | null {
    if (mine + theirs <= 0) return null
    const [a, b] = faster ? [theirs, mine] : [mine, theirs]
    const shareMine = Math.round((100 * a) / Math.max(1, a + b))
    const lead = isEven(a, b) ? null : a > b ? 'mine' : 'theirs'
    return { key, label, mine: format(mine), theirs: format(theirs), shareMine, lead, scored }
  }

  const counted = (key: string, label: string, count: { mine: number; theirs: number } | undefined, scored = true) =>
    count && count.mine + count.theirs >= MIN
      ? row(key, label, count.mine, count.theirs, formatNumber, false, scored)
      : null

  const groups = computed(() => {
    const { report } = data()
    const habits = report.habits
    const rituals = report.rituals
    const voice = report.voice
    const starts = report.responses.iWriteFirstPct
    const speed = versus.value.speed?.pairs[0]
    const lastWord = habits?.lastWordMinePct ?? null
    const out: { key: string; title: string; rows: Row[] }[] = [
      {
        key: 'talk',
        title: t('report.match.group.talk'),
        rows: [
          starts === null
            ? null
            : row('starts', t('report.habits.starts'), starts, 100 - starts, (value) => formatPercent(value)),
          lastWord === null
            ? null
            : row('lastWord', t('report.match.lastWord'), lastWord, 100 - lastWord, (value) => formatPercent(value)),
          counted('double', t('report.match.doubleTexts'), habits?.doubleTexts, false),
        ].filter((item): item is Row => item !== null),
      },
      {
        key: 'answers',
        title: t('report.match.group.answers'),
        rows: [
          speed
            ? row('speed', t('report.match.speed'), speed.mine.value, speed.theirs.value, formatDuration, true)
            : null,
          counted('questions', t('report.match.questions'), habits?.questionTurns),
          counted('unanswered', t('report.match.unanswered'), habits?.unansweredQuestions, false),
        ].filter((item): item is Row => item !== null),
      },
      {
        key: 'mood',
        title: t('report.match.group.mood'),
        rows: [
          counted('laughs', t('report.match.laughs'), habits?.laughs),
          counted('reactions', t('report.match.reactions'), report.reactions?.given),
          counted('stickers', t('report.talk.stickersTitle'), report.stickers?.count),
        ].filter((item): item is Row => item !== null),
      },
      {
        key: 'day',
        title: t('report.match.group.day'),
        rows: [
          counted('goodMorning', t('report.match.goodMorning'), rituals?.goodMorning),
          counted('morningFirst', t('report.habits.morning'), rituals?.morningFirst),
          counted('goodNight', t('report.match.goodNight'), rituals?.goodNight),
        ].filter((item): item is Row => item !== null),
      },
      {
        key: 'voice',
        title: t('report.match.group.voice'),
        rows: [
          voice && voice.voice.seconds.mine + voice.voice.seconds.theirs > 0
            ? row(
                'voice',
                t('report.duel.voiceLabel'),
                voice.voice.seconds.mine,
                voice.voice.seconds.theirs,
                formatDuration,
              )
            : null,
          voice &&
          voice.round.count.mine + voice.round.count.theirs >= MIN &&
          voice.round.seconds.mine + voice.round.seconds.theirs > 0
            ? row(
                'round',
                t('report.duel.roundLabel'),
                voice.round.seconds.mine,
                voice.round.seconds.theirs,
                formatDuration,
              )
            : null,
        ].filter((item): item is Row => item !== null),
      },
    ]
    return out.filter((group) => group.rows.length)
  })

  const rows = computed(() => groups.value.flatMap((group) => group.rows))
  /** Only the rows where one side leads get bars; the even ones fold into a single line of names. */
  const decisive = computed(() =>
    groups.value
      .map((group) => ({ ...group, rows: group.rows.filter((item) => item.lead) }))
      .filter((group) => group.rows.length),
  )
  const tally = computed(() => ({
    mine: rows.value.filter((item) => item.scored && item.lead === 'mine').length,
    theirs: rows.value.filter((item) => item.scored && item.lead === 'theirs').length,
    even: rows.value.filter((item) => !item.lead).length,
  }))
  const evenNames = computed(() =>
    rows.value
      .filter((item) => !item.lead)
      .map((item) => item.label.toLocaleLowerCase())
      .join(', '),
  )
  /**
   * The sheet's answer, from the scoreboard's own counts: equal leads are «even»; «almost everywhere» only when
   * the other side leads in at most one row and the leader in at least three; otherwise a plain «more often».
   * Rows where more is no merit (unanswered questions, double texts) score nothing and are left out here.
   */
  const answer = computed(() => {
    if (rows.value.filter((item) => item.scored).length < 3) return null
    const { mine, theirs, even } = tally.value
    // Even sides, or most comparisons even (2 : 1 with eleven even reads «почти везде поровну», not a win).
    if (mine === theirs || even > mine + theirs) return t('report.match.answerEven')
    const mineLeads = mine > theirs
    const [lead, other] = mineLeads ? [mine, theirs] : [theirs, mine]
    const most = lead >= 3 && other <= 1
    if (mineLeads) return t(most ? 'report.match.answerMostMine' : 'report.match.answerMine')
    return t(most ? 'report.match.answerMostTheirs' : 'report.match.answerTheirs', { name: name.value })
  })
  /** Most comparisons even: the scoreboard says nothing, the card shows «поровну в N из M» instead. */
  const mostlyEven = computed(() => tally.value.even > tally.value.mine + tally.value.theirs)
  /** Where someone leads among the decisive rows, as the names of the rows: «Вы чаще задаёте вопросы» is built from these. */
  const leads = computed(() => rows.value.filter((item) => item.lead))

  return { rows, decisive, tally, evenNames, answer, mostlyEven, leads }
}

import type { ReportDto, SideCountDto } from '@tg-analyzer/shared'

/** One side of a comparison: the raw amount for the bar and how it is printed. */
export interface VersusSide {
  value: number
  text: string
}

/** Two bars, you and the other side; `label` names the pair when a card holds several. */
export interface VersusPair {
  key: string
  label?: string
  mine: VersusSide
  theirs: VersusSide
}

/** One «who does more» card: the leader as a big word, how far ahead, and the bars. */
export interface Versus {
  key: string
  title: string
  /** «Вы», the other name, or «Поровну» (each card says parity in its own words). */
  figure: string
  /** «в 9,9 раза больше»; empty when even, since the figure already says so. */
  note: string
  /** Who leads; null when even. */
  lead: 'mine' | 'theirs' | null
  /** How many times the leader does more; 1 when even, Infinity when only one side does it. */
  ratio: number
  pairs: VersusPair[]
}

/** A side leads when it does at least this many times more. */
const LEAD_RATIO = 1.25

/** No side leads: the report and «Итоги» call the same pair even (one fact, one answer). */
export function isEven(mine: number, theirs: number) {
  const high = Math.max(mine, theirs)
  const low = Math.min(mine, theirs)
  return low > 0 ? high / low < LEAD_RATIO : high === 0
}
/** Fewer events than this on both sides together is noise. */
const MIN_SAMPLES = 5

type Kind = 'more' | 'often' | 'faster'

/**
 * Every two-sided habit of a private chat as a card of its own. The same numbers feed
 * the sticker card, so one value never gets two answers on the page.
 */
export function useVersus(data: () => ReportDto) {
  const { t, formatDuration, formatNumber, formatPercent } = useI18n()

  const side = (value: number, text: string): VersusSide => ({ value, text })

  /** `mine` / `theirs` are «more is the lead» scores; for reply time pass the inverse. */
  function card(key: string, title: string, kind: Kind, score: [number, number], pairs: VersusPair[]): Versus | null {
    const [mine, theirs] = score
    if (!(mine + theirs > 0)) return null
    const high = Math.max(mine, theirs)
    const low = Math.min(mine, theirs)
    const ratio = low > 0 ? high / low : Infinity
    if (ratio < LEAD_RATIO)
      return {
        key,
        title,
        figure: t('report.duel.evenFigure'),
        note: '',
        lead: null,
        ratio: low > 0 ? ratio : 1,
        pairs,
      }
    const name = data().summary.title
    return {
      key,
      title,
      lead: mine > theirs ? 'mine' : 'theirs',
      ratio,
      figure: mine > theirs ? t('report.you') : name,
      note: Number.isFinite(ratio)
        ? t(`report.duel.${kind}`, { ratio: formatNumber(Math.round(ratio * 10) / 10) })
        : t(mine > theirs ? 'report.duel.onlyMine' : 'report.duel.onlyTheirs'),
      pairs,
    }
  }

  const counted = (count: SideCountDto, format: (value: number) => string = formatNumber): VersusPair => ({
    key: 'count',
    mine: side(count.mine, format(count.mine)),
    theirs: side(count.theirs, format(count.theirs)),
  })

  const enough = (count: SideCountDto | undefined, min = 1): count is SideCountDto =>
    Boolean(count && count.mine + count.theirs >= min)

  const minutes = (seconds: number) => (seconds ? formatDuration(seconds) : formatNumber(0))

  const cards = computed(() => {
    const { report } = data()
    const { responses } = report
    const result: Record<string, Versus | null> = {}

    const starts = responses.iWriteFirstPct
    result.starts =
      starts === null
        ? null
        : card(
            'starts',
            t('report.duel.starts'),
            'often',
            [starts, 100 - starts],
            [
              {
                key: 'share',
                mine: side(starts, formatPercent(starts)),
                theirs: side(100 - starts, formatPercent(100 - starts)),
              },
            ],
          )

    const { medianMineSec: mineSec, medianTheirsSec: theirsSec } = responses
    result.speed =
      mineSec !== null && theirsSec !== null
        ? card(
            'speed',
            t('report.duel.speed'),
            'faster',
            [theirsSec, mineSec],
            [
              {
                key: 'median',
                mine: side(mineSec, formatDuration(mineSec)),
                theirs: side(theirsSec, formatDuration(theirsSec)),
              },
            ],
          )
        : null

    const questions = report.habits?.questionTurns
    result.questions = enough(questions, MIN_SAMPLES)
      ? card('questions', t('report.duel.questions'), 'often', [questions.mine, questions.theirs], [counted(questions)])
      : null

    const laughs = report.habits?.laughs
    result.laughs = enough(laughs, MIN_SAMPLES)
      ? card('laughs', t('report.fmt.laughsTitle'), 'often', [laughs.mine, laughs.theirs], [counted(laughs)])
      : null

    const reactions = report.reactions?.given
    result.reactions = enough(reactions)
      ? card('reactions', t('report.duel.reactions'), 'often', [reactions.mine, reactions.theirs], [counted(reactions)])
      : null

    const stickers = report.stickers?.count
    result.stickers = enough(stickers)
      ? card('stickers', t('report.talk.stickersTitle'), 'often', [stickers.mine, stickers.theirs], [counted(stickers)])
      : null

    // Voice messages and video notes share a card; the leader is by total minutes.
    const voice = report.voice
    if (voice) {
      const pairs = [
        { key: 'voice', label: t('report.duel.voiceLabel'), count: voice.voice.seconds },
        { key: 'round', label: t('report.duel.roundLabel'), count: voice.round.seconds },
      ]
        .filter((pair) => pair.count.mine + pair.count.theirs > 0)
        .map((pair) => ({ ...counted(pair.count, minutes), key: pair.key, label: pair.label }))
      const total = pairs.reduce<[number, number]>(
        (sum, pair) => [sum[0] + pair.mine.value, sum[1] + pair.theirs.value],
        [0, 0],
      )
      result.voice = pairs.length ? card('voice', t('report.duel.voice'), 'more', total, pairs) : null
    } else result.voice = null

    return result
  })

  return cards
}

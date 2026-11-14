import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { Resvg } from '@resvg/resvg-js'
import { fillDailyGaps, type PublicShareDto } from '@tg-analyzer/shared'
import satori from 'satori'

/**
 * The picture a messenger shows under a shared link (og:image, 1200×630): the person's poster as the app draws it —
 * their colour lit from the top-left and deepening to the bottom-right, the pair's names, how many messages over which
 * months, the mirrored pulse (you in ink above the line, them in their deep tone below). It shows exactly what the
 * guest page shows: no names when the author hid them. satori lays it out and turns the text into outlines,
 * resvg draws the PNG — no system fonts needed.
 */

const WIDTH = 1200
const HEIGHT = 630
const BARS = 72

/** The seven families of tokens.css (light theme): poster, light, shade, deep. Index 1–7 as `telegramHueIndex`. */
const PALETTE: Record<number, { poster: string; light: string; shade: string; deep: string }> = {
  1: { poster: '#fbd530', light: '#fde9a1', shade: '#eac328', deep: '#5d4703' },
  2: { poster: '#ffbb69', light: '#ffdab0', shade: '#f4ab59', deep: '#6f3c02' },
  3: { poster: '#c6b9fe', light: '#dfd9ff', shade: '#b8aafc', deep: '#45339e' },
  4: { poster: '#b8df5e', light: '#d7eead', shade: '#a7d052', deep: '#365502' },
  5: { poster: '#6ce6d2', light: '#b6f2e6', shade: '#5dd7c4', deep: '#0a574c' },
  6: { poster: '#92cafe', light: '#c4e2ff', shade: '#7fbdf9', deep: '#104a88' },
  7: { poster: '#ffa4da', light: '#ffceeb', shade: '#f792cf', deep: '#7c1f5a' },
}
const INK = '#17171a'

type Lang = 'ru' | 'en'

const NBSP = ' '

const TEXT = {
  ru: {
    pair: (me: string, name: string) => `${me} и ${name}`,
    author: 'Автор',
    partner: 'Собеседник',
    messages: (count: number) => {
      const mod10 = count % 10
      const mod100 = count % 100
      const word =
        mod10 === 1 && mod100 !== 11
          ? 'сообщение'
          : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
            ? 'сообщения'
            : 'сообщений'
      return `${count.toLocaleString('ru-RU')} ${word}`
    },
    span: (messages: string, months: string) => `${messages} · ${months}`,
    quiz: (author: string) => `Угадайка от ${author}`,
    quizLede: 'Кто пишет первым, кто быстрее отвечает — угадаете?',
  },
  en: {
    pair: (me: string, name: string) => `${me} and ${name}`,
    author: 'Author',
    partner: 'Their contact',
    messages: (count: number) => `${count.toLocaleString('en-US')} ${count === 1 ? 'message' : 'messages'}`,
    span: (messages: string, months: string) => `${messages} · ${months}`,
    quiz: (author: string) => `A quiz from ${author}`,
    quizLede: 'Who writes first, who answers faster — can you guess?',
  },
} as const

const require = createRequire(import.meta.url)
let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 600 }[]> | null = null
function loadFonts() {
  fonts ??= Promise.all(
    (['cyrillic', 'latin'] as const).flatMap((subset) =>
      ([400, 600] as const).map(async (weight) => ({
        // One family name per subset: satori keeps one font per name and weight, and falls back by the list below.
        name: subset === 'latin' ? 'Onest' : 'Onest Cyrillic',
        weight,
        data: await readFile(require.resolve(`@fontsource/onest/files/onest-${subset}-${weight}-normal.woff`)),
      })),
    ),
  )
  return fonts
}

/** The pulse folded into `BARS` columns, heights 8–100 % on a square-root scale, as the app's `Pulse`. */
function pulse(daily: { sent: number; received: number }[]) {
  const out = Array.from({ length: BARS }, () => ({ sent: 0, received: 0 }))
  daily.forEach((day, index) => {
    const slot = out[Math.min(BARS - 1, Math.floor((index * BARS) / Math.max(1, daily.length)))]!
    slot.sent += day.sent
    slot.received += day.received
  })
  const peak = Math.max(1, ...out.map((item) => Math.max(item.sent, item.received)))
  const scale = (value: number) => Math.max(8, Math.round(Math.sqrt(value / peak) * 100))
  return out.map((item) => ({ up: scale(item.sent), down: scale(item.received) }))
}

type Node = { type: string; props: Record<string, unknown> & { children?: unknown } }
const el = (type: string, style: Record<string, unknown>, children?: unknown): Node => ({
  type,
  props: { style, children },
})

function brandMark() {
  const heights = [10, 18, 26, 16, 24, 12, 20, 8]
  return el(
    'div',
    { display: 'flex', alignItems: 'center', gap: 3, height: 28 },
    heights.map((height) => el('div', { width: 4, height, borderRadius: 4, backgroundColor: INK })),
  )
}

function card(share: PublicShareDto, lang: Lang) {
  const text = TEXT[lang]
  const colours = PALETTE[share.hue] ?? PALETTE[4]!
  let heading: string
  let lede: string
  let bars: { up: number; down: number }[] = []
  if (share.kind === 'report') {
    const author = share.settings.showName ? share.author : text.author
    const partner = share.data.summary.title || text.partner
    heading = text.pair(author, partner)
    const days = fillDailyGaps(share.data.report.activity.daily)
    const first = days[0]?.date
    const last = days.at(-1)?.date
    const messages = text.messages(share.data.report.totals.messages)
    // The same line as the report's poster and the guest page (useChatSpan): «4 800 сообщений · май — ноябрь 2026».
    const month = (day: string, year: boolean) =>
      new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', {
        month: 'long',
        ...(year ? { year: 'numeric' as const } : {}),
        timeZone: 'UTC',
      })
        .format(new Date(`${day.slice(0, 10)}T00:00:00Z`))
        .replace(/\s?г\.$/u, '')
    lede =
      first && last
        ? text.span(
            messages,
            first.slice(0, 7) === last.slice(0, 7)
              ? month(last, true)
              : `${month(first, first.slice(0, 4) !== last.slice(0, 4))}${NBSP}— ${month(last, true)}`,
          )
        : messages
    bars = pulse(days)
  } else {
    heading = text.quiz(share.author)
    lede = text.quizLede
  }
  const size = heading.length > 22 ? 76 : 100

  const row = (side: 'up' | 'down') =>
    el(
      'div',
      { display: 'flex', alignItems: side === 'up' ? 'flex-end' : 'flex-start', height: 52 },
      bars.map((bar) =>
        el('div', {
          flexGrow: 1,
          flexBasis: 0,
          marginRight: 5,
          height: Math.round((side === 'up' ? bar.up : bar.down) * 0.52),
          borderRadius: 8,
          backgroundColor: side === 'up' ? INK : colours.deep,
        }),
      ),
    )

  // Absolute blocks: satori's column layout under-counts a block of fixed-height rows, so the pulse is pinned to the
  // bottom edge and the names stand on it.
  return el(
    'div',
    {
      position: 'relative',
      width: WIDTH,
      height: HEIGHT,
      display: 'flex',
      color: INK,
      fontFamily: 'Onest, Onest Cyrillic',
      backgroundColor: colours.poster,
      backgroundImage: `radial-gradient(130% 100% at 0% 0%, ${colours.light} 0%, rgba(255,255,255,0) 60%), linear-gradient(165deg, ${colours.poster} 30%, ${colours.shade} 100%)`,
    },
    [
      el('div', { position: 'absolute', left: 64, top: 56, display: 'flex', alignItems: 'center', opacity: 0.8 }, [
        brandMark(),
        el('div', { marginLeft: 14, fontSize: 28, fontWeight: 600, letterSpacing: -0.5 }, 'TGDuet'),
      ]),
      el(
        'div',
        {
          position: 'absolute',
          left: 64,
          right: 64,
          bottom: bars.length ? 204 : 64,
          display: 'flex',
          flexDirection: 'column',
        },
        [
          el('div', { fontSize: size, fontWeight: 600, lineHeight: 1, letterSpacing: -size * 0.05 }, heading),
          el('div', { fontSize: 32, fontWeight: 400, opacity: 0.72, marginTop: 20 }, lede),
        ],
      ),
      bars.length
        ? el(
            'div',
            { position: 'absolute', left: 64, right: 59, bottom: 56, display: 'flex', flexDirection: 'column' },
            [row('up'), el('div', { height: 4 }), row('down')],
          )
        : el('div', { display: 'flex' }),
    ],
  )
}

/** A few recent cards in memory: a link is usually previewed by several messengers within minutes. */
const cache = new Map<string, { at: number; png: Buffer }>()
const CACHE_MS = 10 * 60_000

/** The PNG of a shared link's preview. `key` names the cache entry (token, language, what the author allows). */
export async function renderShareCard(share: PublicShareDto, lang: Lang, key: string): Promise<Buffer> {
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.png
  const svg = await satori(card(share, lang) as unknown as Parameters<typeof satori>[0], {
    width: WIDTH,
    height: HEIGHT,
    fonts: await loadFonts(),
  })
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng()
  cache.set(key, { at: Date.now(), png })
  if (cache.size > 100) cache.delete(cache.keys().next().value!)
  return png
}

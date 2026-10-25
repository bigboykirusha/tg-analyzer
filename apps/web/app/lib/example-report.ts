import {
  ChatReportBuilder,
  deriveReportMetrics,
  reportHeadline,
  weeklyPulse,
  type MessageInput,
  type ReportDto,
} from '@tg-analyzer/shared'

/**
 * A made-up private chat for the public example report: seven months of
 * evenings, mornings and the odd night talk between «you» and Аня. Built with
 * the same report builder as real chats, so the example never drifts from
 * what the app shows. Deterministic: the same report on every visit.
 */

const MINE = [
  'Как прошёл день?',
  'Кофе завтра утром?',
  'Посмотрим фильм вечером?',
  'Я уже еду, буду минут через двадцать',
  'Скинь фотки с выходных',
  'Опять дождь, зонт не взял',
  'Купил билеты на концерт в субботу',
  'Созвонимся после работы?',
  'ахаха да',
  'Как там твой проект?',
  'Спокойной ночи',
  'Доброе утро ☀️',
  'Слушай, а что подарить маме?',
  'Нашёл ту книгу, про которую ты говорила',
  'Во сколько встречаемся?',
  'Ты где?',
  'Пробежка в парке завтра в восемь',
  'Ок, договорились 👍',
  'Это лучшее, что я видел за неделю 😂',
  'Скучаю',
]

const THEIRS = [
  'Нормально, устала немного',
  'Давай! В девять у кофейни',
  'Да, только не ужастик 😅',
  'Жду',
  'Сейчас пришлю',
  'Ахахах, классика',
  'Ура, наконец-то!',
  'Да, после семи',
  'Хахаха',
  'Движется, дедлайн в пятницу',
  'Сладких снов ❤️',
  'Доброе ☀️',
  'Может, плед? Она мёрзнет вечно',
  'О, дай почитать потом',
  'Давай в семь у метро',
  'Уже выхожу',
  'Я пас, просплю 😴',
  'Договорились',
  '😂😂😂',
  'Я тоже ❤️',
  'Ты видел новости?',
  'Как концерт?',
]

const DAY_MS = 86_400_000
const MINUTE_MS = 60_000
/** The chat ends here, so the example reads the same on every visit. */
const LAST_DAY = Date.UTC(2026, 8, 28)
const DAYS = 210

function createRandom(seed: number) {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }
}

export const EXAMPLE_CHAT_ID = 'example'

export function buildExampleReport(partnerName: string): ReportDto {
  const random = createRandom(42)
  const pick = <T>(items: readonly T[]) => items[Math.floor(random() * items.length)]!
  /** Reply delay: usually a minute or two, sometimes an hour. */
  const delay = (median: number) => Math.round(median * Math.exp((random() - 0.5) * 2.6) * MINUTE_MS)

  const builder = new ChatReportBuilder('Europe/Moscow')
  let id = 0
  const add = (ts: number, outgoing: boolean, text = pick(outgoing ? MINE : THEIRS)) => {
    const message: MessageInput = {
      id: String((id += 1)),
      date: new Date(ts),
      outgoing,
      text,
      senderId: outgoing ? 'me' : 'them',
      senderName: outgoing ? null : partnerName,
      replyToId: null,
      kind: random() < 0.07 ? 'media' : random() < 0.03 ? 'voice' : 'text',
    }
    builder.add(message)
  }

  const first = LAST_DAY - (DAYS - 1) * DAY_MS
  for (let day = 0; day < DAYS; day += 1) {
    // A two-week trip in the middle: almost silent.
    const away = day > 96 && day < 110
    if (random() < (away ? 0.85 : 0.1)) continue
    // Moscow is UTC+3: these are local morning, lunch, evening and night hours.
    const talks = [5, 10, 16, 18, 20].filter((hour) => random() < (hour === 16 || hour === 18 ? 0.55 : 0.3))
    if (!talks.length) talks.push(17)
    if (random() < 0.08) talks.push(21) // a talk after midnight
    for (const hourUtc of talks) {
      let ts = first + day * DAY_MS + hourUtc * 3_600_000 + Math.floor(random() * 50) * MINUTE_MS
      let outgoing = random() < 0.72
      const length = 3 + Math.floor(random() ** 1.4 * 26)
      for (let index = 0; index < length; index += 1) {
        add(ts, outgoing)
        if (random() < 0.025) {
          // No answer for a while: write again.
          ts += 35 * MINUTE_MS + delay(8)
          add(ts, outgoing)
        }
        const switches = random() < 0.68
        if (switches) outgoing = !outgoing
        ts += switches ? delay(outgoing ? 2 : 5) : Math.round((10 + random() * 90) * 1000)
      }
    }
  }

  const report = builder.finish('private', new Date(LAST_DAY + DAY_MS))
  return {
    summary: {
      chatId: EXAMPLE_CHAT_ID,
      title: partnerName,
      type: 'private',
      totalMessages: report.totals.messages,
      firstMessageAt: report.period.firstMessageAt,
      lastMessageAt: report.period.lastMessageAt,
      analyzedAt: new Date(LAST_DAY + DAY_MS).toISOString(),
      pulse: weeklyPulse(report.activity.daily),
      headline: reportHeadline(report),
    },
    report,
    derived: deriveReportMetrics(report),
    previous: null,
  }
}

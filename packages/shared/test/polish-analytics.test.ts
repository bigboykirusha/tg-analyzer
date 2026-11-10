import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ChatReportBuilder,
  deriveFavourites,
  deriveHabits,
  deriveReportMetrics,
  deriveWords,
  formatVoiceDuration,
  inMonth,
  isEven,
  isSignificantWordOfChat,
  monthPrepositional,
  sessionSplit,
  shouldShowYear,
  wordOfChatThreshold,
  type ChatReport,
  type MessageInput,
} from '../src'

const MIN = 60_000
const HOUR = 60 * MIN

function message(ts: number, outgoing: boolean, text = 'текст', extra: Partial<MessageInput> = {}): MessageInput {
  return {
    id: String(ts) + (outgoing ? 'o' : 'i'),
    date: new Date(ts),
    outgoing,
    text,
    senderId: outgoing ? 'me' : 'them',
    senderName: null,
    replyToId: null,
    kind: 'text',
    ...extra,
  }
}

/** 300 messages: «блять» is the most written word, then «кофе»; each side has own words. */
function sweary(): ChatReport {
  const builder = new ChatReportBuilder('UTC')
  const start = Date.parse('2026-03-01T10:00:00Z')
  for (let index = 0; index < 150; index += 1) {
    const ts = start + index * 20 * MIN
    builder.add(message(ts, true, index % 2 ? 'блять кофе сегодня' : 'блять опять работа'))
    builder.add(message(ts + 2 * MIN, false, index % 3 === 0 ? 'кофе завтра пиздец' : 'погуляем вечером'))
  }
  return builder.finish('private', new Date('2026-04-15T00:00:00Z'))
}

test('words are kept as they are: the most written word is the word of the chat', () => {
  const report = sweary()
  assert.equal(report.vocabulary.topWords[0]?.value, 'блять')
  assert.equal(deriveWords(report).wordOfChat?.value, 'блять')
  assert.equal(deriveReportMetrics(report).words.wordOfChat?.value, 'блять')
})

test('group word lists are kept as they are', () => {
  const group = {
    sharedVocabulary: [
      { value: 'блять', count: 40 },
      { value: 'кофе', count: 30 },
    ],
    uniqueGroupWords: [{ value: 'пиздец', count: 12 }],
    participants: [
      {
        id: 'a',
        topWords: [
          { value: 'хуй', count: 9 },
          { value: 'бег', count: 8 },
        ],
        topicSignature: [],
      },
    ],
  }
  const report = { vocabulary: sweary().vocabulary, totals: { textMessages: 500 }, group } as unknown as ChatReport
  const view = deriveWords(report).group!
  assert.equal(view.shared.length, 2)
  assert.equal(view.unique.length, 1)
  assert.equal(view.members.a!.topWords.length, 2)
})

// ---------------------------------------------------------------------------
// D2. Significance
// ---------------------------------------------------------------------------

test('a word written 7 times in a 130-message chat is no word of the chat', () => {
  assert.equal(wordOfChatThreshold(130), 10)
  assert.ok(!isSignificantWordOfChat(7, 130))
  assert.ok(isSignificantWordOfChat(10, 130))
  // The bar rises with a long chat: 0.5% of the text messages.
  assert.equal(wordOfChatThreshold(4800), 24)
  assert.ok(!isSignificantWordOfChat(20, 4800))
})

test('a small chat yields no word of the chat and no thin signature words', () => {
  const builder = new ChatReportBuilder('UTC')
  const start = Date.parse('2026-03-01T10:00:00Z')
  for (let index = 0; index < 65; index += 1) {
    builder.add(message(start + index * HOUR, true, index < 7 ? 'обсудить' : `слово${index} фраза${index}`))
    builder.add(message(start + index * HOUR + MIN, false, `ответ${index}`))
  }
  const report = builder.finish('private', new Date('2026-04-15T00:00:00Z'))
  const words = deriveWords(report)
  assert.equal(report.vocabulary.topWords[0]?.value, 'обсудить')
  assert.equal(report.vocabulary.topWords[0]?.count, 7)
  assert.equal(words.wordOfChat, null)
  assert.equal(words.vocabulary.shared.length, 0)
})

// ---------------------------------------------------------------------------
// D3. Habits
// ---------------------------------------------------------------------------

test('isEven: parity below a 1.25 lead, the same rule as the report cards', () => {
  assert.ok(isEven(54, 46))
  assert.ok(isEven(125, 100) === false)
  assert.ok(isEven(124, 100))
  assert.ok(isEven(0, 0))
  assert.ok(!isEven(5, 0))
})

function habitsReport(): ChatReport {
  const base = sweary()
  const side = (mine: number, theirs: number) => ({ mine, theirs })
  return {
    ...base,
    responses: { ...base.responses, iWriteFirstPct: 54 },
    sessions: { ...base.sessions, totalSessions: 100 },
    rituals: {
      mornings: 20,
      morningFirst: side(15, 5), // 3x: leads
      evenings: 10,
      nightLast: side(5, 5),
      goodMorning: side(1, 1),
      goodNight: side(4, 4), // 8 wishes, even
    },
    habits: {
      doubleTexts: side(1, 1),
      lastWordMinePct: 50,
      questions: side(60, 20), // 3x: leads
      laughs: side(30, 28), // even
    },
    voice: {
      voice: { count: side(1, 8), seconds: side(40, 560), longest: null },
      round: { count: side(0, 0), seconds: side(0, 0), longest: null },
    },
    stickers: { count: side(4, 3), distinct: 3, packs: 1, top: [] }, // 7 events: too few
    reactions: {
      given: side(30, 0), // only you
      received: side(0, 30),
      reactedMessages: side(0, 0),
      topBySender: { mine: [], theirs: [] },
      top: [],
    },
  }
}

test('habits: leaders ranked by lead, one list of «поровну», thin ones skipped', () => {
  const summary = deriveHabits(habitsReport())
  assert.deepEqual(
    summary.leads.map((row) => [row.id, row.lead]),
    [
      ['reactions', 'mine'],
      ['voice', 'theirs'],
      // Equal lead (3x): the one with more events first.
      ['questions', 'mine'],
      ['firstMorning', 'mine'],
    ],
  )
  const reactions = summary.leads[0]!
  assert.equal(reactions.ratio, null)
  assert.equal(summary.brightest?.id, 'reactions')
  assert.deepEqual(summary.leads.find((row) => row.id === 'questions')?.ratio, 3)
  assert.equal(summary.leads.find((row) => row.id === 'voice')?.seconds, 600)
  assert.deepEqual(summary.even, ['starts', 'laughs', 'goodNight'])
  assert.deepEqual(summary.skipped, ['stickers'])
})

test('habits: nobody leads gives no brightest; groups and missing data give nothing', () => {
  const even = habitsReport()
  even.rituals!.morningFirst = { mine: 10, theirs: 9 }
  even.habits!.questions = { mine: 21, theirs: 20 }
  even.voice!.voice.count = { mine: 4, theirs: 4 }
  even.reactions!.given = { mine: 10, theirs: 10 }
  const summary = deriveHabits(even)
  assert.deepEqual(summary.leads, [])
  assert.equal(summary.brightest, null)
  assert.deepEqual(summary.even, ['starts', 'firstMorning', 'laughs', 'goodNight', 'questions', 'voice', 'reactions'])

  const group = { ...habitsReport(), group: {} as never }
  assert.equal(deriveHabits(group).brightest, null)
  assert.equal(deriveHabits(group).leads.length, 0)
  const bare = { ...habitsReport(), rituals: null, habits: null, voice: null, stickers: null, reactions: null }
  assert.deepEqual(deriveHabits(bare).leads, [])
})

test('habits: too few events are never a lead, however lopsided', () => {
  const thin = habitsReport()
  thin.habits!.questions = { mine: 9, theirs: 1 } // 10 total, below the floor of 20
  const summary = deriveHabits(thin)
  assert.ok(summary.skipped.includes('questions'))
  assert.ok(!summary.leads.some((row) => row.id === 'questions'))
})

// ---------------------------------------------------------------------------
// Favourites
// ---------------------------------------------------------------------------

test('favourites need three uses; reactions without a picture are not offered', () => {
  const base = sweary()
  const report: ChatReport = {
    ...base,
    vocabulary: {
      ...base.vocabulary,
      topEmoji: [
        { value: '😂', count: 20 },
        { value: '❤️', count: 2 },
      ],
      topEmojiBySender: { mine: [{ value: '😂', count: 12 }], theirs: [{ value: '❤️', count: 2 }] },
    },
    reactions: {
      given: { mine: 5, theirs: 5 },
      received: { mine: 5, theirs: 5 },
      reactedMessages: { mine: 3, theirs: 3 },
      topBySender: {
        mine: [
          { value: 'custom', count: 9 },
          { value: '👍', count: 4 },
        ],
        theirs: [{ value: '🔥', count: 2 }],
      },
      top: [],
    },
    stickers: {
      count: { mine: 8, theirs: 3 },
      distinct: 2,
      packs: 1,
      top: [
        { id: 'a', emoji: '🙈', mine: 5, theirs: 1, thumb: null },
        { id: 'b', emoji: '😴', mine: 3, theirs: 3, thumb: null },
      ],
    },
  }
  const favourites = deriveFavourites(report)
  assert.deepEqual(favourites.topEmoji, [{ value: '😂', count: 20 }])
  assert.equal(favourites.emoji.mine?.value, '😂')
  assert.equal(favourites.emoji.theirs, null)
  assert.equal(favourites.reaction.mine?.value, '👍')
  assert.equal(favourites.reaction.theirs, null)
  assert.deepEqual(favourites.sticker.mine, { id: 'a', emoji: '🙈', count: 5 })
  assert.deepEqual(favourites.sticker.theirs, { id: 'b', emoji: '😴', count: 3 })
})

// ---------------------------------------------------------------------------
// D4. Conversations
// ---------------------------------------------------------------------------

test('conversations: a pause of over 8 hours splits, and over 3 hours across midnight', () => {
  const day = (ts: number) => new Date(ts).toISOString().slice(0, 10)
  const split = sessionSplit(day)
  const noon = Date.parse('2026-03-01T12:00:00Z')
  assert.equal(split(noon, noon + 8 * HOUR), false)
  assert.equal(split(noon, noon + 8 * HOUR + 1), true)
  const late = Date.parse('2026-03-01T22:00:00Z')
  assert.equal(split(late, late + 3 * HOUR), false)
  assert.equal(split(late, late + 3 * HOUR + 1), true)
})

test('conversations: a chat that never pauses for 8 hours is one conversation, however long', () => {
  // The demo chat «Мила» shows «1 д 17 ч» for this reason: a message every few hours chains into one
  // talk. The rule is a documented heuristic; the length is the data, not a split bug.
  const builder = new ChatReportBuilder('UTC')
  const start = Date.parse('2026-03-01T08:00:00Z')
  // 08, 13, 18, 23, 01 (across midnight, 2 h), 06, 11, 16, 21, 00 (3 h), 05: 45 hours without an 8-hour pause.
  const hours = [0, 5, 10, 15, 17, 22, 27, 32, 37, 40, 45]
  hours.forEach((hour, index) => builder.add(message(start + hour * HOUR, index % 2 === 0)))
  const report = builder.finish('private', new Date('2026-04-15T00:00:00Z'))
  assert.equal(report.sessions.totalSessions, 1)
  assert.equal(report.sessions.longestSessionDurationSec, 45 * 3600)
})

// ---------------------------------------------------------------------------
// E5. Text rules
// ---------------------------------------------------------------------------

test('months in the prepositional case', () => {
  assert.equal(monthPrepositional(8, 'ru'), 'августе')
  assert.equal(monthPrepositional('2026-05', 'ru'), 'мае')
  assert.equal(inMonth('2026-08', 'ru'), 'в августе')
  assert.equal(inMonth('2025-12-14', 'ru', 2025), 'в декабре 2025')
  assert.equal(inMonth(3, 'en'), 'in March')
  assert.equal(inMonth(13, 'ru'), '')
})

test('the year is shown for reports over a year long or across a year boundary', () => {
  assert.equal(shouldShowYear('2026-05-20T00:00:00Z', '2026-11-10T00:00:00Z'), false)
  assert.equal(shouldShowYear('2025-12-14T00:00:00Z', '2026-02-02T00:00:00Z'), true)
  assert.equal(shouldShowYear('2025-01-01T00:00:00Z', '2025-12-31T00:00:00Z'), false)
  assert.equal(shouldShowYear('2024-03-01T00:00:00Z', '2026-03-01T00:00:00Z'), true)
  assert.equal(shouldShowYear(null, '2026-03-01T00:00:00Z'), false)
})

test('a recording is written with its units', () => {
  const nb = ' '
  assert.equal(formatVoiceDuration(629, 'ru'), `10${nb}мин 29${nb}с`)
  assert.equal(formatVoiceDuration(45, 'ru'), `45${nb}с`)
  assert.equal(formatVoiceDuration(600, 'ru'), `10${nb}мин`)
  assert.equal(formatVoiceDuration(7500, 'ru'), `2${nb}ч 5${nb}мин`)
  assert.equal(formatVoiceDuration(629, 'en'), `10${nb}min 29${nb}s`)
  assert.equal(formatVoiceDuration(null, 'ru'), '')
})

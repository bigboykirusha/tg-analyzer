import test from 'node:test'
import assert from 'node:assert/strict'
import { ChatReportBuilder, deriveQuiz, deriveReportMetrics, QUIZ_LENGTH, type MessageInput } from '../src'

const MIN = 60_000
const DAY = 24 * 60 * MIN

function message(ts: number, outgoing: boolean, text = 'текст'): MessageInput {
  return {
    id: String(ts) + (outgoing ? 'o' : 'i'),
    date: new Date(ts),
    outgoing,
    text,
    senderId: outgoing ? 'me' : 'them',
    senderName: null,
    replyToId: null,
    kind: 'text',
  }
}

/** You write first and answer in a minute; they answer in four and laugh. */
function chat() {
  const builder = new ChatReportBuilder('UTC')
  const start = Date.parse('2026-03-02T18:00:00Z')
  for (let day = 0; day < 40; day += 1) {
    const base = start + day * DAY
    builder.add(message(base, true, 'Как дела? Что делаешь вечером?'))
    builder.add(message(base + 4 * MIN, false, 'ахах норм'))
    builder.add(message(base + 5 * MIN, true, 'отлично'))
  }
  return builder.finish('private', new Date('2026-04-15T00:00:00Z'))
}

test('the quiz asks who is ahead and knows the answer', () => {
  const quiz = deriveQuiz(chat())
  const byId = new Map(quiz.map((question) => [question.id, question]))
  assert.ok(quiz.length > 0 && quiz.length <= QUIZ_LENGTH)
  assert.equal(byId.get('starts')?.answer, 'mine')
  assert.equal(byId.get('starts')?.mine, 100)
  // They take four minutes, you one: the smaller number wins.
  assert.equal(byId.get('fastest')?.answer, 'mine')
  assert.equal(byId.get('talker')?.answer, 'mine')
  assert.equal(byId.get('laughs')?.answer, 'theirs')
  assert.deepEqual(deriveReportMetrics(chat()).quiz, quiz)
})

test('the quiz skips ties, short chats and groups', () => {
  const builder = new ChatReportBuilder('UTC')
  builder.add(message(Date.parse('2026-03-02T18:00:00Z'), true))
  assert.deepEqual(deriveQuiz(builder.finish('private')), [])
  assert.deepEqual(deriveQuiz(new ChatReportBuilder('UTC').finish('group')), [])

  const even = new ChatReportBuilder('UTC')
  for (let index = 0; index < 120; index += 1)
    even.add(message(Date.parse('2026-03-02T18:00:00Z') + index * MIN, index % 2 === 0))
  const ids = deriveQuiz(even.finish('private')).map((question) => question.id)
  assert.ok(!ids.includes('talker'))
})

/** Both sides write the same amount, answer alike and laugh alike: only «who it was» questions are left. */
function balancedChat(options: { firstOutgoing: boolean; breakerOutgoing: boolean; longestVoiceOutgoing: boolean }) {
  const builder = new ChatReportBuilder('UTC')
  const start = Date.parse('2026-03-02T18:00:00Z')
  const { firstOutgoing, breakerOutgoing, longestVoiceOutgoing } = options
  for (let index = 0; index < 120; index += 1) {
    const outgoing = (index % 2 === 0) === firstOutgoing
    builder.add(message(start + index * MIN, outgoing))
  }
  // A silence of ten days, ended by one side.
  const after = start + 120 * MIN + 10 * DAY
  builder.add(message(after, breakerOutgoing))
  const voice = (ts: number, outgoing: boolean, durationSec: number): MessageInput => ({
    ...message(ts, outgoing, ''),
    kind: 'voice',
    durationSec,
  })
  builder.add(voice(after + MIN, longestVoiceOutgoing, 120))
  builder.add(voice(after + 2 * MIN, !longestVoiceOutgoing, 20))
  return builder.finish('private', new Date('2026-04-15T00:00:00Z'))
}

test('a balanced chat still has questions with one clear answer', () => {
  const report = balancedChat({ firstOutgoing: true, breakerOutgoing: false, longestVoiceOutgoing: true })
  const quiz = deriveQuiz(report)
  assert.ok(quiz.length >= 3, `only ${quiz.map((question) => question.id)}`)
  assert.ok(!quiz.some((question) => question.id === 'talker'))
  const byId = new Map(quiz.map((question) => [question.id, question]))
  assert.deepEqual(byId.get('firstMessage'), { id: 'firstMessage', unit: 'fact', mine: 1, theirs: 0, answer: 'mine' })
  assert.deepEqual(byId.get('pauseBreaker'), {
    id: 'pauseBreaker',
    unit: 'fact',
    mine: 0,
    theirs: 1,
    answer: 'theirs',
  })
  assert.equal(byId.get('longestVoice')?.answer, 'mine')
})

test('the who-it-was answers follow the chat', () => {
  const report = balancedChat({ firstOutgoing: false, breakerOutgoing: true, longestVoiceOutgoing: false })
  const answers = Object.fromEntries(deriveQuiz(report).map((question) => [question.id, question.answer]))
  assert.equal(answers.firstMessage, 'theirs')
  assert.equal(answers.pauseBreaker, 'mine')
  assert.equal(answers.longestVoice, 'theirs')
})

test('a close call is still a question; only all but equal sides are a tie', () => {
  const ids = (sent: number, received: number) => {
    const report = chat()
    report.totals.sent = sent
    report.totals.received = received
    return deriveQuiz(report).map((question) => question.id)
  }
  // 5 % ahead: the old 15 % rule dropped it, now it is asked.
  assert.ok(ids(1050, 1000).includes('talker'))
  assert.ok(!ids(1005, 1000).includes('talker'))
})

test('two times that read the same on screen are a tie', () => {
  const fastest = (mine: number, theirs: number) => {
    const report = chat()
    report.responses.medianMineSec = mine
    report.responses.medianTheirsSec = theirs
    return deriveQuiz(report).find((question) => question.id === 'fastest')
  }
  // 2 min 5 s and 2 min both print «2 мин».
  assert.equal(fastest(125, 120), undefined)
  assert.equal(fastest(125, 185)?.answer, 'mine')
})

test('the who-it-was questions always get their places, spread among the numbers', () => {
  const report = balancedChat({ firstOutgoing: true, breakerOutgoing: false, longestVoiceOutgoing: true })
  report.totals.sent = 2000
  report.totals.received = 1000
  const ids = deriveQuiz(report).map((question) => question.id)
  const facts = ['firstMessage', 'pauseBreaker', 'longestVoice']
  assert.ok(ids.length <= QUIZ_LENGTH)
  assert.ok(facts.every((id) => ids.includes(id as never)))
  assert.ok(!facts.includes(ids[0]!), 'a number opens the game')
})

test('a pause whose breaker is unknown (null) asks no question', () => {
  const report = balancedChat({ firstOutgoing: true, breakerOutgoing: false, longestVoiceOutgoing: true })
  assert.ok(report.facts.longestGap)
  ;(report.facts.longestGap as { brokenByMe?: boolean | null }).brokenByMe = null
  assert.equal(
    deriveQuiz(report).some((question) => question.id === 'pauseBreaker'),
    false,
  )
})

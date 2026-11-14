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

test('numeric questions come before the who-it-was ones', () => {
  const ids = deriveQuiz(chat()).map((question) => question.id)
  const firstFact = ids.findIndex((id) => id === 'firstMessage' || id === 'pauseBreaker' || id === 'longestVoice')
  if (firstFact >= 0)
    assert.ok(ids.slice(firstFact).every((id) => ['firstMessage', 'pauseBreaker', 'longestVoice'].includes(id)))
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

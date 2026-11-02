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

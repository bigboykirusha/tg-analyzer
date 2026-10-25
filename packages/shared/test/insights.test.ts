import test from 'node:test'
import assert from 'node:assert/strict'
import { ChatReportBuilder, deriveInsights, deriveReportMetrics, type MessageInput } from '../src'

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

/** Forty days of evening talks that you always start and they answer slowly. */
function oneSidedChat() {
  const builder = new ChatReportBuilder('UTC')
  const start = Date.parse('2026-03-01T18:00:00Z')
  for (let day = 0; day < 40; day += 1) {
    const base = start + day * DAY
    builder.add(message(base, true, 'Как ты? Что делаешь?'))
    builder.add(message(base + 40 * MIN, true, 'ау'))
    builder.add(message(base + 120 * MIN, false, 'ахаха нормально'))
    builder.add(message(base + 121 * MIN, true, 'кино смотрим вечером?'))
  }
  return builder.finish('private', new Date('2026-04-15T00:00:00Z'))
}

test('a one-sided chat yields initiative, reply speed and double-text insights, strongest first', () => {
  const insights = deriveInsights(oneSidedChat())
  const ids = insights.map((insight) => insight.id)
  assert.ok(ids.includes('initiative'))
  assert.equal(insights.find((insight) => insight.id === 'initiative')?.side, 'mine')
  assert.equal(insights.find((insight) => insight.id === 'initiative')?.values.pct, 100)
  assert.equal(insights.find((insight) => insight.id === 'double_texts')?.side, 'mine')
  assert.equal(insights.find((insight) => insight.id === 'laughs')?.side, 'theirs')
  assert.equal(insights.find((insight) => insight.id === 'questions')?.side, 'mine')
  for (let index = 1; index < insights.length; index += 1) {
    assert.ok(insights[index - 1]!.strength >= insights[index]!.strength)
  }
  assert.ok(insights.length <= 6)
  assert.deepEqual(deriveReportMetrics(oneSidedChat()).insights, insights)
})

test('short chats and groups get no insights', () => {
  const builder = new ChatReportBuilder('UTC')
  builder.add(message(Date.parse('2026-01-01T10:00:00Z'), true))
  builder.add(message(Date.parse('2026-01-01T10:01:00Z'), false))
  assert.deepEqual(deriveInsights(builder.finish('private')), [])
  assert.deepEqual(deriveInsights(builder.finish('group')), [])
})

test('reports stored before habits existed still produce insights without them', () => {
  const report = { ...oneSidedChat(), habits: null }
  const ids = deriveInsights(report).map((insight) => insight.id)
  assert.ok(ids.includes('initiative'))
  assert.ok(!ids.includes('double_texts'))
})

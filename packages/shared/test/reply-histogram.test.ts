import test from 'node:test'
import assert from 'node:assert/strict'
import { ChatReportBuilder, REPLY_BUCKETS_SEC, replyHistogram, type MessageInput } from '../src'

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

/** You always write first and wait; they answer in a minute or two. */
function chat() {
  const builder = new ChatReportBuilder('UTC')
  const start = Date.parse('2026-03-02T18:00:00Z') // a Monday
  for (let day = 0; day < 40; day += 1) {
    const base = start + day * DAY
    builder.add(message(base, true, 'Как дела?'))
    builder.add(message(base + 2 * MIN, false, 'норм'))
    builder.add(message(base + 3 * MIN, true, 'отлично'))
  }
  return builder.finish('private', new Date('2026-04-15T00:00:00Z'))
}

test('replyHistogram sorts answers into the documented buckets', () => {
  assert.equal(REPLY_BUCKETS_SEC.length + 1, 5)
  assert.deepEqual(replyHistogram([5, 59, 60, 299, 300, 1799, 1800, 7199, 7200, 99_999]), [2, 2, 2, 2, 2])
  assert.deepEqual(replyHistogram([]), [0, 0, 0, 0, 0])
})

test('the report keeps a weekday × hour heatmap and a reply histogram', () => {
  const report = chat()
  const heatmap = report.activity.heatmap!
  assert.equal(heatmap.length, 168)
  assert.equal(
    heatmap.reduce((sum, value) => sum + value, 0),
    report.totals.messages,
  )
  // Mondays at 18:00 UTC: weekday 1 (0 = Sunday), hour 18.
  assert.ok(heatmap[1 * 24 + 18]! > 0)
  const { histogram } = report.responses
  assert.equal(
    histogram!.mine.reduce((a, b) => a + b, 0),
    report.responses.mineSamples,
  )
  assert.equal(
    histogram!.theirs.reduce((a, b) => a + b, 0),
    report.responses.theirsSamples,
  )
  // They answered in two minutes: the 1–5 minute bucket.
  assert.equal(histogram!.theirs[1], report.responses.theirsSamples)
})

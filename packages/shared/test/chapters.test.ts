import test from 'node:test'
import assert from 'node:assert/strict'
import { computeChapters, type DatedActivityDto } from '../src'

const DAY_MS = 86_400_000

/** `perDay[i]` messages a day for each month in turn, from 1 January 2025. */
function history(perDay: number[]): DatedActivityDto[] {
  const days: DatedActivityDto[] = []
  perDay.forEach((count, month) => {
    const first = Date.UTC(2025, month, 1)
    const last = Date.UTC(2025, month + 1, 0)
    for (let ts = first; ts <= last; ts += DAY_MS) {
      days.push({ date: new Date(ts).toISOString().slice(0, 10), sent: count, received: count, total: count * 2 })
    }
  })
  return days
}

test('a short chat has no chapters', () => {
  assert.deepEqual(computeChapters(history([10, 10])), [])
})

test('an even chat has no chapters: nothing to tell', () => {
  assert.deepEqual(computeChapters(history([10, 11, 9, 10, 10, 12])), [])
})

test('a quiet start, a busy stretch and an even pace read as three chapters', () => {
  const chapters = computeChapters(history([3, 4, 10, 25, 26, 10, 10, 11]))
  assert.deepEqual(
    chapters.map(({ kind, from, to }) => [kind, from, to]),
    [
      ['start', '2025-01-01', '2025-02-28'],
      ['steady', '2025-03-01', '2025-03-31'],
      ['peak', '2025-04-01', '2025-05-31'],
      ['steady', '2025-06-01', '2025-08-31'],
    ],
  )
})

test('a silence and what came after it', () => {
  const kinds = computeChapters(history([10, 10, 10, 0, 0, 10, 10, 10])).map((chapter) => chapter.kind)
  assert.deepEqual(kinds, ['start', 'quiet', 'return'])
})

test('a one-month blip inside an even stretch is smoothed away', () => {
  const chapters = computeChapters(history([10, 10, 30, 10, 10, 2, 2, 2]))
  assert.deepEqual(
    chapters.map((chapter) => chapter.kind),
    ['start', 'calm'],
  )
  assert.equal(chapters[0]!.to, '2025-05-31')
})

test('never more than five chapters, and every day belongs to exactly one', () => {
  const months = [10, 30, 2, 30, 2, 30, 2, 30, 2, 30, 2, 30]
  const daily = history(months)
  const chapters = computeChapters(daily)
  assert.ok(chapters.length <= 5)
  assert.equal(
    chapters.reduce((sum, chapter) => sum + chapter.days, 0),
    daily.length,
  )
  assert.equal(
    chapters.reduce((sum, chapter) => sum + chapter.messages, 0),
    daily.reduce((sum, day) => sum + day.total, 0),
  )
})

test('a cut first month joins the next one instead of being judged on a few days', () => {
  const daily = history([10, 10, 10, 30, 30, 10]).slice(27)
  const chapters = computeChapters(daily)
  assert.equal(chapters[0]!.from, '2025-01-28')
  assert.equal(chapters[0]!.kind, 'start')
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  computeGaps,
  computeHabits,
  computeResponseRate,
  computeResponseStats,
  computeSessionStats,
  createZonedClock,
  sessionSplit,
} from '../src'

const at = (iso: string, outgoing: boolean) => ({ ts: Date.parse(iso), outgoing })
const HOUR = 60 * 60 * 1000
const utcHour = (ts: number) => new Date(ts).getUTCHours()

test('response stats and gaps follow the conversation turns', () => {
  const start = Date.parse('2026-01-01T00:00:00Z')
  const timeline = [
    { ts: start, outgoing: true },
    { ts: start + 30_000, outgoing: false },
    { ts: start + 65_000, outgoing: true },
    { ts: start + 10 * HOUR, outgoing: false },
    { ts: start + 42 * 24 * HOUR, outgoing: true },
  ]
  const snapshot = [...timeline]

  const responses = computeResponseStats(timeline)
  assert.equal(responses.theirsSamples, 1)
  assert.equal(responses.medianTheirsSec, 30)
  assert.equal(responses.mineSamples, 1)
  assert.equal(responses.medianMineSec, 35)
  assert.equal(responses.iWriteFirstPct, 67)

  const gaps = computeGaps(timeline)
  assert.equal(gaps.longestGap?.seconds, (42 * 24 - 10) * 3600)
  assert.equal(typeof gaps.longestGap?.brokenByMe, 'boolean')
  assert.equal(gaps.silencesOver30Days.length, 1)
  assert.deepEqual(timeline, snapshot)
})

test('empty timelines yield empty metrics', () => {
  const responses = computeResponseStats([])
  assert.equal(responses.mineSamples, 0)
  assert.equal(responses.responseRate, null)
  assert.equal(responses.iWriteFirstPct, null)
  assert.deepEqual(computeGaps([]), { longestGap: null, silencesOver30Days: [] })
})

test('the session boundary is inclusive', () => {
  const start = Date.parse('2026-01-01T00:00:00Z')
  const result = computeResponseStats([
    { ts: start, outgoing: true },
    { ts: start + 8 * HOUR, outgoing: false },
    { ts: start + 16 * HOUR + 1, outgoing: true },
  ])
  assert.equal(result.theirsSamples, 1)
  assert.equal(result.mineSamples, 0)
  assert.equal(result.iWriteFirstPct, 100)
})

test('response rate counts answered turns', () => {
  assert.equal(computeResponseRate([]), null)
  assert.equal(computeResponseRate([at('2026-01-01T00:00:00Z', true)]), null)
  assert.equal(
    computeResponseRate([
      at('2026-01-01T00:00:00Z', false),
      at('2026-01-01T00:01:00Z', true),
      at('2026-01-01T00:02:00Z', false),
    ]),
    66.67,
  )
})

test('sessions split on long silences and use the local hour for night sessions', () => {
  const start = Date.parse('2026-01-01T08:00:00Z')
  const result = computeSessionStats(
    [
      { ts: start, outgoing: true },
      { ts: start + 8 * HOUR, outgoing: false },
      { ts: start + 16 * HOUR + 1, outgoing: true },
    ],
    1,
    utcHour,
  )
  assert.equal(result.totalSessions, 2)
  assert.equal(result.averageSessionMessages, 2)
  assert.equal(result.averageSessionDurationSec, 14_400)
  assert.equal(result.sessionsPerActiveWeek, 2)
  assert.equal(result.highlights[0]?.totalMessages, 2)

  const moscow = createZonedClock('Europe/Moscow')
  const night = computeSessionStats(
    [at('2026-01-01T22:00:00Z', false), at('2026-01-02T12:00:00Z', true)],
    2,
    (ts) => moscow(ts).hour,
  )
  assert.equal(night.nightSessionsPct, 50)
})

test('sessions tolerate unsorted input and invalid timestamps', () => {
  const timeline = [
    at('2026-01-01T10:05:00Z', false),
    { ts: Number.NaN, outgoing: true },
    at('2026-01-01T10:00:00Z', true),
  ]
  const snapshot = [...timeline]
  const result = computeSessionStats(timeline, 1, utcHour)
  assert.equal(result.totalSessions, 1)
  assert.equal(result.averageSessionDurationSec, 300)
  assert.deepEqual(timeline, snapshot)
})

test('a silence across local midnight ends the session even under eight hours', () => {
  const moscow = createZonedClock('Europe/Moscow')
  const split = sessionSplit((ts) => moscow(ts).day)
  // 23:00 and 03:30 the next night in Moscow: 4.5 hours apart, two talks.
  const overnight = [at('2026-01-01T20:00:00Z', true), at('2026-01-02T00:30:00Z', false)]
  assert.equal(computeSessionStats(overnight, 1, utcHour, split).totalSessions, 2)
  assert.equal(computeSessionStats(overnight, 1, utcHour).totalSessions, 1)
  // A short pause across midnight keeps one talk going.
  const lateChat = [at('2026-01-01T20:50:00Z', true), at('2026-01-01T21:20:00Z', false)]
  assert.equal(computeSessionStats(lateChat, 1, utcHour, split).totalSessions, 1)
})

test('habits count double texts and who has the last word', () => {
  const start = Date.parse('2026-01-01T10:00:00Z')
  const MIN = 60_000
  const habits = computeHabits(
    [
      { ts: start, outgoing: true },
      { ts: start + 45 * MIN, outgoing: true }, // no answer for 45 minutes: a double text
      { ts: start + 46 * MIN, outgoing: false },
      { ts: start + 47 * MIN, outgoing: false }, // a quick follow-up is not
      { ts: start + 20 * HOUR, outgoing: true },
      { ts: start + 20 * HOUR + MIN, outgoing: false },
      { ts: start + 20 * HOUR + 2 * MIN, outgoing: true },
    ],
    { questions: { mine: 2, theirs: 1 }, laughs: { mine: 0, theirs: 3 } },
  )
  assert.deepEqual(habits.doubleTexts, { mine: 1, theirs: 0 })
  assert.equal(habits.lastWordMinePct, 50)
  assert.deepEqual(habits.laughs, { mine: 0, theirs: 3 })
  assert.equal(
    computeHabits([], { questions: { mine: 0, theirs: 0 }, laughs: { mine: 0, theirs: 0 } }).lastWordMinePct,
    null,
  )
})

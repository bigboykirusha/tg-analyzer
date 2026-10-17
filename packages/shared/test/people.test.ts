import test from 'node:test'
import assert from 'node:assert/strict'
import { computeContactStats } from '../src'

const DAY = 24 * 60 * 60 * 1000
const MINUTE = 60 * 1000
const now = Date.parse('2026-06-30T12:00:00Z')

test('contact stats compare the last 30 days with the 30 before and ignore older messages', () => {
  const messages = [
    // Older than 90 days: ignored.
    { ts: now - 120 * DAY, outgoing: true },
    // 31–60 days ago: two messages.
    { ts: now - 45 * DAY, outgoing: true },
    { ts: now - 45 * DAY + 5 * MINUTE, outgoing: false },
    // Last 30 days: a conversation started by them; I reply in 2 minutes, they in 10.
    { ts: now - 2 * DAY, outgoing: false },
    { ts: now - 2 * DAY + 2 * MINUTE, outgoing: true },
    { ts: now - 2 * DAY + 12 * MINUTE, outgoing: false },
    { ts: now - 2 * DAY + 14 * MINUTE, outgoing: true },
  ]
  const stats = computeContactStats({ chatId: '1', title: 'Катя', hasAvatar: false, messages }, now)

  assert.equal(stats.messages90, 6)
  assert.equal(stats.last30, 4)
  assert.equal(stats.previous30, 2)
  assert.equal(stats.sent90, 3)
  assert.equal(stats.received90, 3)
  assert.equal(stats.medianMineSec, 120)
  // They replied after 5 and 10 minutes: the median is 7.5 minutes.
  assert.equal(stats.medianTheirsSec, 450)
  assert.equal(stats.conversations, 2)
  assert.equal(stats.iWriteFirstPct, 50)
  assert.equal(stats.lastMessageAt, new Date(now - 2 * DAY + 14 * MINUTE).toISOString())
})

test('an empty chat yields zeros and no medians', () => {
  const stats = computeContactStats({ chatId: '2', title: 'Пусто', hasAvatar: true, messages: [] }, now)
  assert.equal(stats.messages90, 0)
  assert.equal(stats.medianMineSec, null)
  assert.equal(stats.iWriteFirstPct, null)
  assert.equal(stats.conversations, 0)
  assert.equal(stats.lastMessageAt, null)
})

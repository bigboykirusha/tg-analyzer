import test from 'node:test'
import assert from 'node:assert/strict'
import { deriveHomeEvents, type RecentActivityResponse, type ReportSummaryDto, type UserShareLinkDto } from '../src'

const report = (chatId: string, title: string, totalMessages: number, perWeek: number): ReportSummaryDto => ({
  chatId,
  title,
  type: 'private',
  totalMessages,
  firstMessageAt: null,
  lastMessageAt: null,
  analyzedAt: '2026-10-03T12:00:00.000Z',
  pulse: Array.from({ length: 8 }, () => ({ sent: perWeek / 2, received: perWeek / 2 })),
  headline: { sentSharePct: 50, iWriteFirstPct: 50, medianMineSec: 60, medianTheirsSec: 60 },
})
const recent = (chats: [string, string, number, number, number][]): RecentActivityResponse => ({
  since: '2026-10-08T00:00:00.000Z',
  days: 30,
  activeChats: chats.length,
  chats: chats.map(([id, title, messages, mine, total]) => ({
    id,
    title,
    hasAvatar: false,
    lastMessageAt: null,
    messages,
    mine,
    total,
  })),
  stale: false,
})

test('the month, new messages, the next round number and the busiest chat without a report, in this order', () => {
  const events = deriveHomeEvents(
    [report('1', 'Мила', 3_560, 154), report('2', 'Мама', 1_900, 14)],
    recent([
      ['1', 'Мила', 1_240, 600, 4_800],
      ['3', 'Дима', 612, 270, 2_600],
      ['2', 'Мама', 40, 20, 1_910],
    ]),
  )
  assert.deepEqual(
    events.map((event) => event.kind),
    ['month', 'new', 'milestone', 'unanalysed'],
  )
  assert.deepEqual(events[0], {
    kind: 'month',
    messages: 1_892,
    chats: 3,
    minePct: 47,
    top: [
      { chatId: '1', title: 'Мила', messages: 1_240 },
      { chatId: '3', title: 'Дима', messages: 612 },
      { chatId: '2', title: 'Мама', messages: 40 },
    ],
  })
  const news = events[1]!
  assert.equal(news.kind === 'new' && news.added, 1_240)
  // 200 to go at 22 a day.
  assert.deepEqual(events[2], { kind: 'milestone', chatId: '1', title: 'Мила', index: 5_000, days: 10 })
  assert.deepEqual(events[3], { kind: 'unanalysed', chatId: '3', title: 'Дима', messages: 612, place: 2 })
})

test('a quiz answer shows only with its score', () => {
  const link = (score: number | null): UserShareLinkDto => ({
    chatId: '2',
    title: 'Мама',
    kind: 'quiz',
    expiresAt: null,
    result: { answeredAt: '2026-11-07T10:00:00.000Z', score, total: 5, correct: null },
  })
  assert.deepEqual(deriveHomeEvents([], null, [link(4)]), [
    { kind: 'quiz', chatId: '2', title: 'Мама', score: 4, total: 5 },
  ])
  assert.deepEqual(deriveHomeEvents([], null, [link(null)]), [])
})

test('nothing to say makes no events', () => {
  assert.deepEqual(
    deriveHomeEvents([report('1', 'Мила', 4_800, 0)], recent([['1', 'Мила', 10, 5, 4_810]])).map((e) => e.kind),
    ['month'],
  )
})

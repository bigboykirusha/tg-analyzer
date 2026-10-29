import test from 'node:test'
import assert from 'node:assert/strict'
import {
  ChatReportBuilder,
  computeGroupReport,
  computeHealthScore,
  computeRelationshipScore,
  createZonedClock,
  deriveReportMetrics,
  hasSufficientGroupRetentionPeriod,
  resolveGroupRole,
  type MessageInput,
} from '../src'

let nextId = 1
function message(iso: string, outgoing: boolean, text = '', extra: Partial<MessageInput> = {}): MessageInput {
  return {
    id: String(nextId++),
    date: new Date(iso),
    outgoing,
    text,
    senderId: outgoing ? 'me' : 'friend',
    senderName: outgoing ? 'Me' : 'Friend',
    replyToId: null,
    kind: 'text',
    ...extra,
  }
}

const responses = {
  medianMineSec: 60,
  medianTheirsSec: 120,
  mineSamples: 3,
  theirsSamples: 3,
  mineP25Sec: 60,
  mineP75Sec: 60,
  mineP95Sec: 60,
  theirsP25Sec: 120,
  theirsP75Sec: 120,
  theirsP95Sec: 120,
  responseRate: 80,
  iWriteFirstPct: 50,
}
const sessions = {
  totalSessions: 10,
  averageSessionMessages: 8,
  averageSessionDurationSec: 100,
  longestSessionMessages: 20,
  longestSessionDurationSec: 300,
  sessionsPerActiveWeek: 2,
  nightSessionsPct: 10,
  highlights: [],
}

test('a private chat report aggregates counters in the user time zone', () => {
  const builder = new ChatReportBuilder('Europe/Moscow')
  builder.add(message('2026-01-01T21:30:00Z', true, 'Привет! Как дела? 😀'))
  builder.add(message('2026-01-01T21:31:00Z', false, 'Отлично, спасибо 😀😀'))
  builder.add(message('2026-01-01T21:40:00Z', true, '', { kind: 'sticker' }))
  builder.add(message('2026-01-03T10:00:00Z', false, 'фото', { kind: 'media' }))

  const report = builder.finish('private', new Date('2026-01-10T00:00:00Z'))

  assert.deepEqual(report.totals, { messages: 4, sent: 2, received: 2, chars: 45, words: 6, textMessages: 3 })
  assert.deepEqual(report.composition, { text: 2, media: 1, voice: 0, sticker: 1, file: 0 })
  // 21:30 UTC is 00:30 the next day in Moscow.
  assert.equal(report.activity.hourly[0]?.total, 3)
  assert.deepEqual(
    report.activity.daily.map((day) => [day.date, day.total]),
    [
      ['2026-01-02', 3],
      ['2026-01-03', 1],
    ],
  )
  assert.equal(report.activity.weekday[5]?.total, 3)
  assert.deepEqual(report.vocabulary.topEmoji, [{ value: '😀', count: 3 }])
  assert.deepEqual(report.vocabulary.topEmojiBySender.theirs, [{ value: '😀', count: 2 }])
  assert.equal(report.vocabulary.uniqueWordsBySender.mine[0]?.value, 'дела')
  assert.equal(report.responses.mineSamples, 1)
  assert.equal(report.responses.theirsSamples, 1)
  assert.equal(report.facts.activeDays, 2)
  assert.ok(report.relationship)
  assert.equal(report.group, null)
  assert.equal(report.period.firstMessageAt, '2026-01-01T21:30:00.000Z')

  const derived = deriveReportMetrics(report)
  assert.equal(derived.activityDistribution.night.total, 3)
  assert.equal(derived.compositionStats.textSharePct, 50)
})

test('group reports track participants, replies and pairs', () => {
  const builder = new ChatReportBuilder('UTC')
  const first = message('2026-01-01T10:00:00Z', true, 'launch design', { senderId: 'u1', senderName: 'Alex' })
  builder.add(first)
  builder.add(message('2026-01-01T10:10:00Z', true, 'launch design', { senderId: 'u1', senderName: 'Alex' }))
  builder.add(
    message('2026-01-01T10:20:00Z', false, 'launch design', { senderId: 'u2', senderName: 'Sam', replyToId: first.id }),
  )

  const report = builder.finish('group', new Date('2026-01-01T12:00:00Z'))
  assert.ok(report.group?.health)
  assert.equal(report.group.health.responseCoverage, 50)
  assert.equal(report.group.health.consistency, 100)
  assert.equal(report.group.participants[0]?.id, 'u1')
  assert.equal(report.group.participants[0]?.isSelf, true)
  assert.equal(report.group.participants[0]?.starterCount, 1)
  assert.equal(report.group.participants[0]?.repliesReceived, 1)
  assert.equal(report.group.topPairs[0]?.directReplies, 1)
  // Sam answered Alex once; Alex never answered Sam.
  assert.deepEqual(report.group.replyMap, {
    participantIds: ['u1', 'u2'],
    cells: [
      [0, 0],
      [1, 0],
    ],
  })
  assert.equal(report.relationship, null)
  assert.equal(report.health, null)
  assert.equal(report.responses.iWriteFirstPct, null)
})

test('an empty group has no invented health', () => {
  const report = new ChatReportBuilder().finish('group')
  assert.equal(report.group?.health, null)
  assert.deepEqual(report.group?.participants, [])
  assert.equal(report.sessions.totalSessions, 0)
})

test('group retention needs 180 local calendar days', () => {
  const utc = createZonedClock('UTC')
  const first = Date.parse('2026-01-01T12:00:00Z')
  assert.equal(hasSufficientGroupRetentionPeriod(first, Date.parse('2026-06-28T12:00:00Z'), utc), false)
  assert.equal(hasSufficientGroupRetentionPeriod(first, Date.parse('2026-06-29T12:00:00Z'), utc), true)

  const zonedFirst = Date.parse('2026-01-01T00:30:00Z')
  const zonedLast = Date.parse('2026-06-28T23:30:00Z')
  assert.equal(hasSufficientGroupRetentionPeriod(zonedFirst, zonedLast, utc), false)
  assert.equal(hasSufficientGroupRetentionPeriod(zonedFirst, zonedLast, createZonedClock('America/New_York')), true)
})

test('retention and churn use 90-day windows in the report time zone', () => {
  const firstMessageAt = Date.parse('2026-01-01T12:00:00Z')
  const lastMessageAt = Date.parse('2026-07-31T12:00:00Z')
  const participants = [
    { id: 'recent', firstSeen: firstMessageAt, lastSeen: lastMessageAt },
    { id: 'old', firstSeen: firstMessageAt, lastSeen: Date.parse('2026-05-03T01:00:00Z') },
    { id: 'late', firstSeen: Date.parse('2026-04-01T05:00:00Z'), lastSeen: lastMessageAt },
  ].map((participant) => ({
    ...participant,
    name: participant.id,
    isSelf: false,
    messageCount: 1,
    textMessageCount: 1,
    wordCount: 1,
    mediaCount: 0,
    activeDays: new Set(['2026-01-01']),
    wordCounts: new Map<string, number>(),
    emojiCounts: new Map<string, number>(),
  }))

  const report = computeGroupReport({
    totalMessages: 3,
    nonTextMessages: 0,
    firstMessageAt,
    lastMessageAt,
    activeDays: 2,
    now: lastMessageAt,
    clock: createZonedClock('America/New_York'),
    wordCounts: new Map(),
    timeline: [],
    messageSenders: new Map(),
    participants,
  })
  assert.equal(report.health?.retentionRate, 50)
  assert.equal(report.health?.churnedMembers, 1)
})

test('group roles prefer recent activity and understand legacy roles', () => {
  const now = Date.parse('2026-06-01T00:00:00Z')
  assert.equal(resolveGroupRole({ lastSeen: '2026-01-01T00:00:00Z', messageShare: 40 }, now), 'inactive')
  assert.equal(resolveGroupRole({ role: 'ghost' }, now), 'inactive')
  assert.equal(
    resolveGroupRole({ firstSeen: '2026-05-20T00:00:00Z', lastSeen: '2026-05-30T00:00:00Z' }, now),
    'newcomer',
  )
  assert.equal(resolveGroupRole({ messageShare: 20, lastSeen: '2026-05-30T00:00:00Z' }, now), 'anchor')
  assert.equal(resolveGroupRole({ messageShare: 3, lastSeen: '2026-05-30T00:00:00Z' }, now), 'contributor')
})

test('relationship and health scores are defined only with enough signal', () => {
  assert.equal(
    computeRelationshipScore({
      sentMessages: 0,
      receivedMessages: 0,
      responses,
      activeDays: 0,
      maxStreakDays: 0,
      trend: 'unknown',
    }),
    null,
  )
  const relationship = computeRelationshipScore({
    sentMessages: 50,
    receivedMessages: 50,
    responses,
    activeDays: 30,
    maxStreakDays: 12,
    trend: 'stable',
  })
  assert.ok(relationship)
  assert.equal(
    computeHealthScore({ responseRate: 80, sessions, activeDays: 30, relationship, trend: 'stable' })?.label,
    'strong',
  )
  assert.equal(
    computeHealthScore({ responseRate: null, sessions, activeDays: 30, relationship, trend: 'stable' }),
    null,
  )
  assert.equal(
    computeHealthScore({ responseRate: 80, sessions, activeDays: 30, relationship: null, trend: 'stable' }),
    null,
  )
})

test('health fragmentation penalises extra sessions per active day', () => {
  const relationship = {
    score: 70,
    label: 'balanced' as const,
    reciprocity: 70,
    responsiveness: 70,
    stability: 70,
    attentionBalance: 70,
  }
  const health = (totalSessions: number) =>
    computeHealthScore({
      responseRate: 80,
      sessions: { ...sessions, totalSessions },
      activeDays: 10,
      relationship,
      trend: 'stable',
    })

  assert.equal(health(10)?.fragmentation, 0)
  assert.equal(health(20)?.fragmentation, 50)
  assert.equal(health(40)?.fragmentation, 75)
  assert.ok((health(10)?.score ?? 0) > (health(20)?.score ?? 0))
})

test('aggregation of a large chat stays fast', () => {
  const builder = new ChatReportBuilder('Europe/Moscow')
  const start = Date.parse('2024-01-01T00:00:00Z')
  const started = performance.now()
  for (let index = 0; index < 100_000; index += 1) {
    builder.add({
      id: String(index),
      date: new Date(start + index * 97_000),
      outgoing: index % 3 === 0,
      text: index % 10 === 0 ? 'Привет, как дела? 👍' : 'обычное сообщение про работу и планы',
      senderId: index % 3 === 0 ? 'me' : 'friend',
      senderName: null,
      replyToId: null,
      kind: 'text',
    })
  }
  const report = builder.finish('private')
  const elapsed = performance.now() - started
  assert.equal(report.totals.messages, 100_000)
  assert.ok(elapsed < 5_000, `aggregation took ${Math.round(elapsed)}ms`)
})

test('top words drop topic-less lemmas and show verbs in their infinitive', () => {
  // A toy lemmatiser: every form of a verb maps to its infinitive.
  const lemmas: Record<string, string> = {
    говорю: 'говорить',
    сказала: 'сказать',
    гуляла: 'гулять',
    гуляли: 'гулять',
    гуляем: 'гулять',
    такого: 'такой',
    кофе: 'кофе',
  }
  const builder = new ChatReportBuilder('UTC', { wordKey: (word) => lemmas[word] ?? word })
  builder.add(message('2026-01-01T10:00:00Z', true, 'говорю сказала гуляла кофе'))
  builder.add(message('2026-01-01T10:01:00Z', false, 'гуляли такого гуляем кофе'))
  const words = builder.finish('private').vocabulary.topWords.map((item) => item.value)
  assert.deepEqual(words.sort(), ['гулять', 'кофе'])
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { ChatReportBuilder, type ChatReport, type MessageInput } from '../src'

/**
 * Cross-checks the report against slow, obvious re-implementations on random
 * chats: same-second bursts, message ids that cross a digit, summer-time
 * changes and night-owl conversations. The builder is also fed the way
 * Telegram serves history (newest first) and must not care.
 */

function random(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TEXTS = [
  'привет',
  'как дела?',
  'ок',
  'доброе утро',
  'спокойной ночи',
  'ахах',
  'что думаешь?',
  'пойдём в кино',
  "don't worry",
  'я не знаю',
  'я и ты',
  'утро!',
  'ты где',
  'созвонимся вечером',
  '',
]

interface Setup {
  messages: MessageInput[]
  timeZone: string
}

function generate(seed: number, timeZone: string, from: string, days: number, senders: string[]): Setup {
  const next = random(seed)
  const pick = <T>(items: readonly T[]) => items[Math.floor(next() * items.length)]!
  const start = Date.parse(from)
  const drafts: Omit<MessageInput, 'id'>[] = []
  for (let day = 0; day < days; day += 1) {
    if (next() < 0.2) continue
    for (let burst = 0, bursts = 1 + Math.floor(next() * 4); burst < bursts; burst += 1) {
      // Late evenings and nights are over-represented on purpose.
      let ts = start + day * 86_400_000 + Math.floor(next() * 86_400) * 1000
      if (next() < 0.35) ts = start + day * 86_400_000 + (20 + Math.floor(next() * 9)) * 3_600_000
      let sender = pick(senders)
      for (let index = 0, size = 1 + Math.floor(next() * 6); index < size; index += 1) {
        if (next() < 0.45) sender = pick(senders)
        // Often the same second as the message before.
        ts += next() < 0.3 ? 0 : Math.floor(next() * 150) * 1000
        const outgoing = sender === senders[0]
        const roll = next()
        const draft: Omit<MessageInput, 'id'> = {
          date: new Date(ts),
          outgoing,
          text: pick(TEXTS),
          senderId: sender,
          senderName: sender,
          replyToId: null,
          kind: 'text',
        }
        if (roll < 0.08) Object.assign(draft, { kind: 'voice', text: '', durationSec: 3 + Math.floor(next() * 120) })
        else if (roll < 0.12)
          Object.assign(draft, {
            kind: 'sticker',
            text: '',
            sticker: { id: `s${Math.floor(next() * 5)}`, emoji: '😀', setId: 'pack' },
          })
        else if (roll < 0.15)
          Object.assign(draft, { kind: 'media', text: '', round: true, durationSec: 5 + Math.floor(next() * 50) })
        if (next() < 0.12)
          draft.reactions = [
            { emoji: pick(['👍', '❤', '😂']), count: 1 + Math.floor(next() * 2), mine: next() < 0.5 },
            ...(next() < 0.3 ? [{ emoji: 'custom', count: 1, mine: false }] : []),
          ]
        drafts.push(draft)
      }
    }
  }
  drafts.sort((left, right) => left.date.getTime() - right.date.getTime())
  // Ids start just below a power of ten so that «999» and «1000» meet.
  const messages = drafts.map((draft, index) => ({ ...draft, id: String(990 + index) }))
  return { messages, timeZone }
}

function build(setup: Setup, order: 'oldest-first' | 'newest-first', chatType: 'private' | 'group') {
  const builder = new ChatReportBuilder(setup.timeZone)
  const ordered = order === 'oldest-first' ? setup.messages : [...setup.messages].reverse()
  for (const message of ordered) builder.add(message)
  return builder.finish(chatType, new Date('2027-01-01T00:00:00Z'))
}

function localParts(timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    weekday: 'short',
  })
  return (ts: number) => {
    const parts = Object.fromEntries(formatter.formatToParts(ts).map((part) => [part.type, part.value]))
    return {
      day: `${parts.year}-${parts.month}-${parts.day}`,
      hour: Number(parts.hour),
      weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday!),
    }
  }
}

const CASES: { seed: number; timeZone: string; from: string; days: number }[] = [
  // Summer time ends on 25 October in Berlin, on 1 November in New York.
  { seed: 1, timeZone: 'Europe/Berlin', from: '2026-10-18T00:00:00Z', days: 14 },
  { seed: 2, timeZone: 'America/New_York', from: '2026-10-26T00:00:00Z', days: 14 },
  // …and starts on 29 March / 8 March.
  { seed: 3, timeZone: 'Europe/Berlin', from: '2026-03-23T00:00:00Z', days: 14 },
  { seed: 4, timeZone: 'America/New_York', from: '2026-03-02T00:00:00Z', days: 14 },
  { seed: 5, timeZone: 'Asia/Kolkata', from: '2026-05-01T00:00:00Z', days: 30 },
  { seed: 6, timeZone: 'Europe/Moscow', from: '2026-01-01T00:00:00Z', days: 60 },
  { seed: 7, timeZone: 'Pacific/Auckland', from: '2026-09-20T00:00:00Z', days: 20 },
  { seed: 8, timeZone: 'UTC', from: '2026-06-01T00:00:00Z', days: 40 },
]

for (const { seed, timeZone, from, days } of CASES) {
  const setup = generate(seed, timeZone, from, days, ['me', 'she'])
  const label = `${timeZone}, seed ${seed}`
  const { messages } = setup

  test(`the report does not depend on the order messages arrive in (${label})`, () => {
    assert.deepEqual(build(setup, 'newest-first', 'private'), build(setup, 'oldest-first', 'private'))
  })

  test(`counts match a plain recount (${label})`, () => {
    const report = build(setup, 'newest-first', 'private')
    const local = localParts(timeZone)

    const sent = messages.filter((message) => message.outgoing).length
    assert.equal(report.totals.messages, messages.length)
    assert.equal(report.totals.sent, sent)
    assert.equal(report.totals.received, messages.length - sent)

    const hourly = Array.from({ length: 24 }, () => 0)
    const weekday = Array.from({ length: 7 }, () => 0)
    const daily = new Map<string, number>()
    for (const message of messages) {
      const parts = local(message.date.getTime())
      hourly[parts.hour]! += 1
      weekday[parts.weekday]! += 1
      daily.set(parts.day, (daily.get(parts.day) ?? 0) + 1)
    }
    assert.deepEqual(
      report.activity.hourly.map((entry) => entry.total),
      hourly,
    )
    assert.deepEqual(
      report.activity.weekday.map((entry) => entry.total),
      weekday,
    )
    assert.deepEqual(
      report.activity.daily.map((entry) => [entry.date, entry.total]),
      [...daily].sort(([left], [right]) => left.localeCompare(right)),
    )
    assert.equal(report.facts.activeDays, daily.size)
    for (const entry of [...report.activity.hourly, ...report.activity.weekday, ...report.activity.daily])
      assert.equal(entry.sent + entry.received, entry.total)

    const kinds = { text: 0, media: 0, voice: 0, sticker: 0, file: 0 }
    for (const message of messages) kinds[message.kind] += 1
    assert.deepEqual(report.composition, kinds)
  })

  test(`voice, stickers and reactions match a plain recount (${label})`, () => {
    const report = build(setup, 'newest-first', 'private')
    const side = (message: MessageInput) => (message.outgoing ? 'mine' : 'theirs')

    const seconds = { mine: 0, theirs: 0 }
    const roundSeconds = { mine: 0, theirs: 0 }
    const stickers = { mine: 0, theirs: 0 }
    const given = { mine: 0, theirs: 0 }
    const received = { mine: 0, theirs: 0 }
    for (const message of messages) {
      if (message.round) roundSeconds[side(message)] += message.durationSec ?? 0
      else if (message.kind === 'voice') seconds[side(message)] += message.durationSec ?? 0
      if (message.kind === 'sticker') stickers[side(message)] += 1
      for (const reaction of message.reactions ?? []) {
        given.mine += reaction.mine ? 1 : 0
        given.theirs += reaction.count - (reaction.mine ? 1 : 0)
        // What lands under your own message from your own hand is not received.
        received[side(message)] += message.outgoing ? reaction.count - (reaction.mine ? 1 : 0) : reaction.count
      }
    }
    assert.deepEqual(report.voice?.voice.seconds, seconds)
    assert.deepEqual(report.voice?.round.seconds, roundSeconds)
    assert.deepEqual(report.stickers?.count, stickers)
    assert.deepEqual(report.reactions?.given, given)
    assert.deepEqual(report.reactions?.received, received)
  })

  test(`milestones are the n-th message in time order (${label})`, () => {
    const report = build(setup, 'newest-first', 'private')
    for (const milestone of report.milestones ?? []) {
      const expected = messages[milestone.index - 1]!
      assert.equal(milestone.at, expected.date.toISOString())
      assert.equal(milestone.mine, expected.outgoing)
    }
    assert.ok((report.milestones ?? []).some((milestone) => milestone.index === 1))
  })

  test(`mornings and evenings match a plain recount (${label})`, () => {
    const report = build(setup, 'newest-first', 'private')
    const local = localParts(timeZone)
    const HOUR = 3_600_000
    const dayBefore = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10)

    const mornings = { count: 0, mine: 0, theirs: 0 }
    const openedDays = new Set<string>()
    messages.forEach((message, index) => {
      const ts = message.date.getTime()
      const { day, hour } = local(ts)
      if (hour < 5 || openedDays.has(day)) return
      openedDays.add(day)
      if (hour >= 12) return
      const before = messages[index - 1]
      if (before && ts - before.date.getTime() < 3 * HOUR) return
      const answered = messages
        .slice(index + 1)
        .some(
          (other) =>
            other.date.getTime() - ts <= 4 * HOUR &&
            local(other.date.getTime()).day === day &&
            other.senderId !== message.senderId,
        )
      if (!answered) return
      mornings.count += 1
      mornings[message.outgoing ? 'mine' : 'theirs'] += 1
    })

    const evenings = new Map<string, MessageInput[]>()
    for (const message of messages) {
      const { day, hour } = local(message.date.getTime())
      if (hour >= 5 && hour < 21) continue
      const key = hour < 5 ? dayBefore(day) : day
      evenings.set(key, [...(evenings.get(key) ?? []), message])
    }
    const nights = { count: 0, mine: 0, theirs: 0 }
    for (const group of evenings.values()) {
      if (new Set(group.map((message) => message.senderId)).size < 2) continue
      nights.count += 1
      nights[group[group.length - 1]!.outgoing ? 'mine' : 'theirs'] += 1
    }

    assert.equal(report.rituals?.mornings, mornings.count)
    assert.deepEqual(report.rituals?.morningFirst, { mine: mornings.mine, theirs: mornings.theirs })
    assert.equal(report.rituals?.evenings, nights.count)
    assert.deepEqual(report.rituals?.nightLast, { mine: nights.mine, theirs: nights.theirs })
  })

  test(`questions and replies match a plain recount (${label})`, () => {
    const report = build(setup, 'newest-first', 'private')
    const HOUR = 3_600_000
    const asks = (message: MessageInput) => message.text.includes('?') || message.text === 'ты где'
    const answeredBy = (message: MessageInput) =>
      (message.reactions ?? []).some((reaction) =>
        message.outgoing ? reaction.count > (reaction.mine ? 1 : 0) : reaction.mine,
      )

    const turns = { mine: 0, theirs: 0 }
    const unanswered = { mine: 0, theirs: 0 }
    for (const outgoing of [true, false]) {
      const key = outgoing ? 'mine' : 'theirs'
      // A run: questions of one side with no answer, no reaction and no 12-hour wait between them.
      const runs: MessageInput[][] = []
      messages.forEach((message, index) => {
        if (message.outgoing !== outgoing || !asks(message)) return
        const last = runs[runs.length - 1]?.at(-1)
        const joins =
          last &&
          !answeredBy(last) &&
          message.date.getTime() - last.date.getTime() <= 12 * HOUR &&
          !messages.slice(messages.indexOf(last), index).some((other) => other.outgoing !== outgoing)
        if (joins) runs[runs.length - 1]!.push(message)
        else runs.push([message])
      })
      for (const run of runs) {
        const last = run[run.length - 1]!
        const lastIndex = messages.indexOf(last)
        const reply = messages.slice(lastIndex + 1).find((other) => other.outgoing !== outgoing)
        const lateMessage = messages
          .slice(lastIndex + 1)
          .some((other) => other.date.getTime() - last.date.getTime() > 12 * HOUR)
        if (answeredBy(last)) turns[key] += 1
        else if (reply && reply.date.getTime() - last.date.getTime() <= 12 * HOUR) turns[key] += 1
        else if (reply || lateMessage) {
          turns[key] += 1
          unanswered[key] += 1
        }
        // Otherwise it is still waiting at the end of the chat and not counted.
      }
    }
    assert.deepEqual(report.habits?.questionTurns, turns)
    assert.deepEqual(report.habits?.unansweredQuestions, unanswered)
  })

  test(`group members add up to the chat (${label})`, () => {
    const crowd = generate(seed + 100, timeZone, from, days, ['me', 'ann', 'bob', 'eve'])
    const report = build(crowd, 'newest-first', 'group')
    const group = report.group!
    assert.equal(
      group.participants.reduce((sum, participant) => sum + participant.messageCount, 0),
      report.totals.messages,
    )
    assert.equal(
      group.participants.reduce((sum, participant) => sum + participant.morningFirst!, 0),
      report.rituals!.mornings,
    )
    assert.equal(
      group.participants.reduce((sum, participant) => sum + participant.nightLast!, 0),
      report.rituals!.evenings,
    )
    assert.equal(
      group.participants.reduce((sum, participant) => sum + participant.stickerCount!, 0),
      report.stickers!.count.mine + report.stickers!.count.theirs,
    )
    const shares = group.participants.reduce((sum, participant) => sum + participant.messageShare, 0)
    assert.ok(Math.abs(shares - 100) < 0.5, `shares add up to ${shares}`)
    const forward = build(crowd, 'oldest-first', 'group').group!
    const byId = (items: typeof group.participants) => [...items].sort((left, right) => left.id.localeCompare(right.id))
    assert.deepEqual(byId(group.participants), byId(forward.participants))
  })
}

test('chats with one message or none still make a report', () => {
  const empty = new ChatReportBuilder('UTC').finish('private')
  assert.equal(empty.totals.messages, 0)
  assert.equal(empty.rituals?.mornings, 0)
  assert.deepEqual(empty.milestones, [])

  const one = new ChatReportBuilder('UTC')
  one.add({
    id: '1',
    date: new Date('2026-01-01T09:00:00Z'),
    outgoing: true,
    text: 'привет?',
    senderId: 'me',
    senderName: 'Me',
    replyToId: null,
    kind: 'text',
  })
  const report: ChatReport = one.finish('private')
  assert.equal(report.totals.messages, 1)
  assert.equal(report.milestones?.length, 1)
  // Nobody answered, and nobody else was there, so there is no morning to count.
  assert.equal(report.rituals?.mornings, 0)
  assert.deepEqual(report.habits?.questionTurns, { mine: 0, theirs: 0 })
})

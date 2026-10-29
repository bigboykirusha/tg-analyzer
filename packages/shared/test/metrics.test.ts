import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeMessageText, ChatReportBuilder, computeUnansweredQuestions, stemWord, type MessageInput } from '../src'

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

test('word forms count as one word and show the most common spelling', () => {
  assert.equal(stemWord('работа'), stemWord('работу'))
  assert.equal(stemWord('работе'), stemWord('работой'))
  assert.equal(stemWord('фильмы'), stemWord('фильмов'))
  assert.equal(stemWord('friends'), 'friend')
  assert.equal(stemWord('news'), 'news')

  const builder = new ChatReportBuilder('UTC')
  for (const text of ['работа достала', 'на работе завал', 'опять работа', 'после работы кино'])
    builder.add(message('2026-03-01T10:00:00Z', true, text))
  const report = builder.finish('private')
  assert.deepEqual(report.vocabulary.topWords[0], { value: 'работа', count: 4 })
})

test('links, mentions and stretched letters do not spoil the words', () => {
  const { keywords, wordCount } = analyzeMessageText('смотри https://youtube.com/watch?v=x1 и www.site.ru/page @mila')
  assert.deepEqual(keywords, ['смотри'])
  assert.equal(wordCount, 1)
  assert.deepEqual(analyzeMessageText('спасибоооо, класссс').keywords, ['спасибо', 'класс'])
  // A question mark inside a link is not a question.
  assert.equal(analyzeMessageText('https://example.com/?a=1').asks, false)
})

test('laughter is recognised in its many spellings', () => {
  for (const laugh of [
    'ахахах',
    'АХАХАХАХ',
    'ахпхахпх',
    'хахаха',
    'азазаз',
    'пхпх',
    'хд',
    'хах',
    'lol',
    'hahaha',
    'ахахаххаха',
  ])
    assert.equal(analyzeMessageText(laugh).laughs, true, laugh)
  for (const word of ['аха', 'хата', 'хаза', 'ах', 'пх', 'ахх'])
    assert.equal(analyzeMessageText(word).laughs, false, word)
})

test('good morning and good night wishes are recognised however they are typed', () => {
  for (const text of [
    'Доброе утро!',
    'с добрым утромм',
    'Доброоое утро ☀️',
    'утречко)',
    'доброго утра',
    'Good morning',
    'gm',
  ])
    assert.equal(analyzeMessageText(text).greeting, 'morning', text)
  for (const text of [
    'Спокойной ночи 💤',
    'споки',
    'спок ночи',
    'сладких снов',
    'ладно, я пошла спать',
    'goodnight',
    'gn',
  ])
    assert.equal(analyzeMessageText(text).greeting, 'night', text)
  for (const text of ['this morning was rough', 'утро было тяжёлое', 'ночью не спал', 'спокойно'])
    assert.equal(analyzeMessageText(text).greeting, null, text)
})

test('questions typed without a question mark are noticed, statements are not', () => {
  for (const text of ['как дела', 'ты где', 'а ты дома', 'чё делаешь', 'спишь', 'how are you'])
    assert.equal(analyzeMessageText(text).asks, true, text)
  for (const text of ['как же я устал', 'где-то тут было', 'я дома', 'что-то не то'])
    assert.equal(analyzeMessageText(text).asks, false, text)
})

test('a question runs once and counts as unanswered only if the conversation ends without a reply', () => {
  const at = (minutes: number) => Date.parse('2026-03-01T10:00:00Z') + minutes * 60_000
  const result = computeUnansweredQuestions([
    // Two questions in a row, then an answer: one answered question.
    { ts: at(0), outgoing: true, asks: true },
    { ts: at(1), outgoing: true, asks: true },
    { ts: at(2), outgoing: false, asks: false },
    // They ask, I never answer before a long break.
    { ts: at(3), outgoing: false, asks: true },
    { ts: at(4), outgoing: false, asks: false },
    { ts: at(60 * 10), outgoing: true, asks: false },
    // My question at the very end may still be answered.
    { ts: at(60 * 10 + 1), outgoing: true, asks: true },
  ])
  assert.deepEqual(result.questionTurns, { mine: 1, theirs: 1 })
  assert.deepEqual(result.unansweredQuestions, { mine: 0, theirs: 1 })
})

test('voice messages and video notes are counted in minutes per side', () => {
  const builder = new ChatReportBuilder('UTC')
  builder.add(message('2026-03-01T10:00:00Z', true, '', { kind: 'voice', durationSec: 30 }))
  builder.add(message('2026-03-01T10:01:00Z', false, '', { kind: 'voice', durationSec: 95 }))
  builder.add(message('2026-03-01T10:02:00Z', false, '', { kind: 'voice', durationSec: 5 }))
  builder.add(message('2026-03-01T10:03:00Z', true, '', { kind: 'media', round: true, durationSec: 40 }))
  const { voice } = builder.finish('private')
  assert.deepEqual(voice?.voice.count, { mine: 1, theirs: 2 })
  assert.deepEqual(voice?.voice.seconds, { mine: 30, theirs: 100 })
  assert.equal(voice?.voice.longest?.seconds, 95)
  assert.equal(voice?.voice.longest?.mine, false)
  assert.deepEqual(voice?.round.seconds, { mine: 40, theirs: 0 })
})

test('reactions are split by who put them and whose message got them', () => {
  const builder = new ChatReportBuilder('UTC')
  builder.add(message('2026-03-01T10:00:00Z', false, 'смотри', { reactions: [{ emoji: '❤', count: 1, mine: true }] }))
  builder.add(
    message('2026-03-01T10:01:00Z', true, 'ахах', {
      reactions: [
        { emoji: '😂', count: 1, mine: false },
        { emoji: '👍🏻', count: 1, mine: false },
      ],
    }),
  )
  builder.add(message('2026-03-01T10:02:00Z', true, 'ок', { reactions: [{ emoji: '😂', count: 2, mine: true }] }))
  const { reactions } = builder.finish('private')
  assert.deepEqual(reactions?.given, { mine: 2, theirs: 3 })
  assert.deepEqual(reactions?.received, { mine: 4, theirs: 1 })
  assert.deepEqual(reactions?.reactedMessages, { mine: 2, theirs: 1 })
  assert.deepEqual(reactions?.topBySender.mine, [
    { value: '❤️', count: 1 },
    { value: '😂', count: 1 },
  ])
  assert.deepEqual(reactions?.topBySender.theirs, [
    { value: '😂', count: 2 },
    { value: '👍', count: 1 },
  ])
})

test('stickers are ranked and packs counted', () => {
  const builder = new ChatReportBuilder('UTC')
  const sticker = (id: string, setId: string) => ({ kind: 'sticker' as const, sticker: { id, emoji: '😺', setId } })
  builder.add(message('2026-03-01T10:00:00Z', true, '', sticker('a', 'cats')))
  builder.add(message('2026-03-01T10:01:00Z', false, '', sticker('a', 'cats')))
  builder.add(message('2026-03-01T10:02:00Z', false, '', sticker('b', 'dogs')))
  builder.add(message('2026-03-01T10:03:00Z', true, '', sticker('a', 'cats')))
  const top = builder.topStickers()
  assert.deepEqual(
    top.map((item) => item.id),
    ['a', 'b'],
  )
  const { stickers } = builder.finish('private')
  assert.deepEqual(stickers?.count, { mine: 2, theirs: 2 })
  assert.equal(stickers?.distinct, 2)
  assert.equal(stickers?.packs, 2)
  assert.deepEqual(stickers?.top[0], { id: 'a', emoji: '😺', mine: 2, theirs: 1, thumb: null })
})

test('milestones mark the first, the 100th and the 1000th message', () => {
  const builder = new ChatReportBuilder('UTC')
  const start = Date.parse('2026-01-01T10:00:00Z')
  for (let index = 0; index < 1_200; index += 1)
    builder.add(message(new Date(start + index * 60_000).toISOString(), index % 3 === 0))
  const { milestones } = builder.finish('private')
  assert.deepEqual(
    milestones?.map((milestone) => milestone.index),
    [1, 100, 1_000],
  )
  assert.equal(milestones?.[0]?.at, '2026-01-01T10:00:00.000Z')
  assert.equal(milestones?.[0]?.mine, true)
  assert.equal(milestones?.[2]?.mine, true)
})

test('rituals: who opens the morning and who closes the evening, in local time', () => {
  // Moscow is UTC+3.
  const builder = new ChatReportBuilder('Europe/Moscow')
  // Day 1: they write first at 8:10, I write last at 0:30.
  builder.add(message('2026-03-01T05:10:00Z', false, 'доброе утро'))
  builder.add(message('2026-03-01T05:20:00Z', true, 'утречко'))
  builder.add(message('2026-03-01T19:00:00Z', false, 'как ты'))
  builder.add(message('2026-03-01T21:30:00Z', true, 'спокойной ночи'))
  // Day 2 starts after 5:00 with my message at 13:00: not a morning. They close the evening at 22:00.
  builder.add(message('2026-03-02T10:00:00Z', true, 'привет'))
  builder.add(message('2026-03-02T18:30:00Z', true, 'ну что'))
  builder.add(message('2026-03-02T19:00:00Z', false, 'споки'))
  const { rituals } = builder.finish('private')
  assert.equal(rituals?.mornings, 1)
  assert.deepEqual(rituals?.morningFirst, { mine: 0, theirs: 1 })
  assert.equal(rituals?.evenings, 2)
  assert.deepEqual(rituals?.nightLast, { mine: 1, theirs: 1 })
  assert.deepEqual(rituals?.goodMorning, { mine: 1, theirs: 1 })
  assert.deepEqual(rituals?.goodNight, { mine: 1, theirs: 1 })
})

test('group members get their own voice, sticker, reaction and ritual counts', () => {
  const builder = new ChatReportBuilder('UTC')
  const from = (id: string, iso: string, extra: Partial<MessageInput> = {}) =>
    message(iso, false, '', { senderId: id, senderName: id, ...extra })
  builder.add(from('ann', '2026-03-01T07:00:00Z', { text: 'доброе утро всем' }))
  builder.add(from('bob', '2026-03-01T07:05:00Z', { kind: 'voice', durationSec: 61 }))
  builder.add(from('bob', '2026-03-01T07:06:00Z', { reactions: [{ emoji: '🔥', count: 3, mine: false }] }))
  builder.add(from('ann', '2026-03-01T23:00:00Z', { kind: 'sticker', sticker: { id: 's', emoji: null, setId: null } }))
  const { group } = builder.finish('group')
  const ann = group?.participants.find((participant) => participant.id === 'ann')
  const bob = group?.participants.find((participant) => participant.id === 'bob')
  assert.equal(ann?.morningFirst, 1)
  assert.equal(ann?.nightLast, 1)
  assert.equal(ann?.greetings, 1)
  assert.equal(ann?.stickerCount, 1)
  assert.equal(bob?.voiceSeconds, 61)
  assert.equal(bob?.reactionsReceived, 3)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeMessageText, createZonedClock, withoutStopWords } from '../src'

test('text analysis counts raw words, filters stop words and normalises tokens', () => {
  assert.deepEqual(analyzeMessageText('HELLO hello the привет и данных Ёлка', new Set(['the', 'и'])), {
    wordCount: 7,
    keywords: ['hello', 'hello', 'привет', 'данных', 'елка'],
    emojis: [],
    asks: false,
    laughs: false,
    greeting: null,
  })
})

test('laughter and questions are noticed, and laughter never becomes a top word', () => {
  const laugh = analyzeMessageText('ахахах ну ты даёшь, правда?')
  assert.equal(laugh.laughs, true)
  assert.equal(laugh.asks, true)
  assert.ok(!laugh.keywords.includes('ахахах'))
  assert.equal(analyzeMessageText('хахаха').laughs, true)
  assert.equal(analyzeMessageText('lol').laughs, true)
  assert.equal(analyzeMessageText('ну 😂').laughs, true)
  // «аха» means «I see», and «хата» is a flat, not a laugh.
  assert.equal(analyzeMessageText('аха понял').laughs, false)
  assert.equal(analyzeMessageText('хата').laughs, false)
})

test('filler words stay out of the vocabulary, also in reports stored earlier', () => {
  const { keywords } = analyzeMessageText('Короче щас типа будет кино, наверное, вообщем ок')
  assert.deepEqual(keywords, ['кино'])
  assert.deepEqual(
    withoutStopWords([
      { value: 'короче', count: 9 },
      { value: 'ахаха', count: 5 },
      { value: 'кино', count: 3 },
    ]),
    [{ value: 'кино', count: 3 }],
  )
})

test('joined emoji count as one grapheme and text symbols are not emoji', () => {
  // Skin tones merge, so 👍🏽 and 👍 are one favourite.
  assert.deepEqual(analyzeMessageText('семья 👨‍👩‍👧‍👦 ❤️ 👍🏽 #️⃣', new Set()).emojis, ['👨‍👩‍👧‍👦', '❤️', '👍', '#️⃣'])
  // Dashes and symbols are not words; «a» and «12» are.
  assert.deepEqual(analyzeMessageText('a 12 _- -- ... ♥︎ ☆', new Set()), {
    wordCount: 2,
    keywords: [],
    emojis: [],
    asks: false,
    laughs: false,
    greeting: null,
  })
  assert.deepEqual(analyzeMessageText(''), {
    wordCount: 0,
    keywords: [],
    emojis: [],
    asks: false,
    laughs: false,
    greeting: null,
  })
})

test('zoned clock resolves local parts across offsets and DST', () => {
  const moscow = createZonedClock('Europe/Moscow')
  assert.deepEqual(moscow(Date.parse('2026-01-01T22:30:00Z')), {
    day: '2026-01-02',
    month: '2026-01',
    hour: 1,
    weekday: 5,
  })

  const india = createZonedClock('Asia/Kolkata')
  assert.equal(india(Date.parse('2026-01-01T18:29:00Z')).hour, 23)
  assert.equal(india(Date.parse('2026-01-01T18:30:00Z')).day, '2026-01-02')

  const newYork = createZonedClock('America/New_York')
  assert.equal(newYork(Date.parse('2026-03-08T06:59:00Z')).hour, 1)
  assert.equal(newYork(Date.parse('2026-03-08T07:00:00Z')).hour, 3)

  assert.equal(createZonedClock('Not/AZone')(Date.parse('2026-01-01T05:00:00Z')).hour, 5)
})

test('English contractions stay whole, and one-letter words are words', () => {
  const { keywords, wordCount } = analyzeMessageText("I don't think it's what they're saying, I'm not sure")
  assert.deepEqual(keywords, ['saying', 'sure'])
  // «don», «didn», «isn» and «re» never appear as words of their own.
  for (const junk of ['don', 'didn', 'isn', 're', 'm', 's', 't']) assert.ok(!keywords.includes(junk), junk)
  assert.equal(wordCount, 10)
  assert.equal(analyzeMessageText('я и ты в кино').wordCount, 5)
})

test('a bare «утро» greets, while «до утра» does not', () => {
  assert.equal(analyzeMessageText('Утро!').greeting, 'morning')
  assert.equal(analyzeMessageText('всем утро').greeting, 'morning')
  assert.equal(analyzeMessageText('Morning').greeting, 'morning')
  assert.equal(analyzeMessageText('сидели до утра').greeting, null)
  assert.equal(analyzeMessageText('утро было тяжёлое').greeting, null)
})

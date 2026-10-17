import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeMessageText, createZonedClock } from '../src'

test('text analysis counts raw words, filters stop words and normalises tokens', () => {
  assert.deepEqual(analyzeMessageText('HELLO hello the привет и данных Ёлка', new Set(['the', 'и'])), {
    wordCount: 6,
    keywords: ['hello', 'hello', 'привет', 'данных', 'елка'],
    emojis: [],
  })
})

test('joined emoji count as one grapheme and text symbols are not emoji', () => {
  assert.deepEqual(analyzeMessageText('семья 👨‍👩‍👧‍👦 ❤️ 👍🏽 #️⃣', new Set()).emojis, ['👨‍👩‍👧‍👦', '❤️', '👍🏽', '#️⃣'])
  assert.deepEqual(analyzeMessageText('a 12 _- -- ... ♥︎ ☆', new Set()), { wordCount: 3, keywords: [], emojis: [] })
  assert.deepEqual(analyzeMessageText(''), { wordCount: 0, keywords: [], emojis: [] })
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

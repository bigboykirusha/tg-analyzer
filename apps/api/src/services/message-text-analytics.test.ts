import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeMessageText } from '@tg-analyzer/shared'

test('analyzeMessageText counts raw words, filters stop words, and normalizes tokens', () => {
  assert.deepEqual(analyzeMessageText('HELLO hello the привет и данных', new Set(['the', 'и'])), {
    wordCount: 5,
    keywords: ['hello', 'hello', 'привет', 'данных'],
    emojis: [],
  })
})

test('analyzeMessageText counts a joined emoji as one grapheme', () => {
  assert.deepEqual(analyzeMessageText('семья 👨‍👩‍👧‍👦 ❤️ 👍🏽', new Set()), {
    wordCount: 1,
    keywords: ['семья'],
    emojis: ['👨‍👩‍👧‍👦', '❤️', '👍🏽'],
  })
})

test('analyzeMessageText ignores punctuation-only tokens and non-emoji symbols', () => {
  assert.deepEqual(analyzeMessageText('a 12 _- -- ... ♥︎ ☆', new Set()), {
    wordCount: 3,
    keywords: [],
    emojis: [],
  })
})

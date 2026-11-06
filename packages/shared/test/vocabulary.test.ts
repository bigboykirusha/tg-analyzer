import test from 'node:test'
import assert from 'node:assert/strict'
import { splitVocabulary } from '../src'

const items = (entries: Record<string, number>) => Object.entries(entries).map(([value, count]) => ({ value, count }))

test('a word both sides use at a similar rate is shared, with both counts together', () => {
  const split = splitVocabulary(items({ кино: 10, завтра: 6 }), items({ кино: 8, завтра: 5 }))
  assert.deepEqual(split.shared, items({ кино: 18, завтра: 11 }))
  assert.deepEqual(split.mine, [])
  assert.deepEqual(split.theirs, [])
})

test('a word one side uses far more often is that side’s signature, never shared too', () => {
  const split = splitVocabulary(items({ кино: 10, котик: 9 }), items({ кино: 10, котик: 1 }))
  assert.deepEqual(split.shared, items({ кино: 20 }))
  assert.deepEqual(split.mine, items({ котик: 9 }))
  assert.deepEqual(split.theirs, [])
})

test('rates are relative: the side that writes more does not own every word', () => {
  // You write ten times as much; «работа» is the same share of each side's words.
  const split = splitVocabulary(items({ работа: 100, дом: 100 }), items({ работа: 10, дом: 10 }))
  assert.deepEqual(split.shared, items({ дом: 110, работа: 110 }))
  assert.deepEqual(split.mine, [])
})

test('a word missing from a full list counts at that list’s smallest value', () => {
  const full = items(Object.fromEntries(Array.from({ length: 20 }, (_, index) => [`w${index}`, 5])))
  // «море» is absent from their 20 words, so they may have used it up to 5 times: 6 is no signature.
  const close = splitVocabulary([...full, ...items({ море: 6 })], full, { listLimit: 20 })
  assert.ok(!close.mine.some((item) => item.value === 'море'))
  // Their list is short, so it holds every word they used: «море» is yours alone.
  const short = splitVocabulary(items({ море: 6, кино: 6 }), items({ кино: 6 }))
  assert.deepEqual(short.mine, items({ море: 6 }))
})

test('exclusive words become signatures, single uses and excluded words are dropped', () => {
  const split = splitVocabulary(items({ кино: 4 }), items({ кино: 4 }), {
    exclusive: { mine: items({ смузи: 3, раз: 1 }), theirs: items({ дача: 2 }) },
    exclude: ['кино'],
  })
  assert.deepEqual(split.shared, [])
  assert.deepEqual(split.mine, items({ смузи: 3 }))
  assert.deepEqual(split.theirs, items({ дача: 2 }))
})

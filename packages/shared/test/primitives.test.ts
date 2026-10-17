import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildApiPath,
  calculateAverage,
  calculateMedian,
  calculatePercentile,
  clampNumber,
  normalizeCount,
  topItems,
} from '../src'

test('median and average handle empty and even-sized samples without mutating input', () => {
  const values = [9, 1, 4, 2]
  assert.equal(calculateMedian([]), null)
  assert.equal(calculateMedian(values), 3)
  assert.equal(calculateMedian([5, 1, 3]), 3)
  assert.equal(calculateAverage([]), 0)
  assert.equal(calculateAverage(values), 4)
  assert.deepEqual(values, [9, 1, 4, 2])
})

test('percentiles use nearest rank and clamping keeps bounds', () => {
  assert.equal(calculatePercentile([], 95), null)
  assert.equal(calculatePercentile([10, 20, 30, 40], 25), 10)
  assert.equal(calculatePercentile([10, 20, 30, 40], 95), 40)
  assert.equal(calculatePercentile([10, 20, 30, 40], -1), 10)
  assert.equal(calculatePercentile([10, 20, 30, 40], 101), 40)
  assert.equal(clampNumber(-5), 0)
  assert.equal(clampNumber(130), 100)
  assert.equal(clampNumber(15, 10, 20), 15)
  assert.equal(normalizeCount(12.8), 12)
  assert.equal(normalizeCount(-1), 0)
  assert.equal(normalizeCount(Number.NaN), 0)
  assert.equal(normalizeCount('12'), 0)
})

test('top items are ordered by count and then alphabetically', () => {
  const counts = new Map([
    ['b', 2],
    ['a', 2],
    ['c', 5],
  ])
  assert.deepEqual(topItems(counts, 2), [
    { value: 'c', count: 5 },
    { value: 'a', count: 2 },
  ])
})

test('api paths substitute and encode parameters strictly', () => {
  assert.equal(buildApiPath('/api/v1/reports/:chatId', { chatId: '-100 1' }), '/api/v1/reports/-100%201')
  assert.throws(() => buildApiPath('/api/v1/reports/:chatId'), /Missing route parameter/)
  assert.throws(() => buildApiPath('/api/v1/reports', { chatId: '1' }), /Unexpected route parameter/)
})

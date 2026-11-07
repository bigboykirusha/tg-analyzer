import test from 'node:test'
import assert from 'node:assert/strict'
import { forecastMilestone, type DatedActivityDto } from '../src'

const now = new Date('2026-11-07T12:00:00Z')
/** `count` messages a day for the `days` days up to and including 7 November 2026. */
const lastDays = (days: number, count: number): DatedActivityDto[] =>
  Array.from({ length: days }, (_, index) => ({
    date: new Date(now.getTime() - index * 86_400_000).toISOString().slice(0, 10),
    sent: count,
    received: 0,
    total: count,
  }))

test('the next round number comes at the pace of the last four weeks', () => {
  assert.deepEqual(forecastMilestone(4_800, lastDays(60, 20), now), { index: 5_000, days: 10 })
})

test('a chat that went quiet gets no forecast', () => {
  const old = lastDays(60, 20).slice(30)
  assert.equal(forecastMilestone(4_800, old, now), null)
})

test('more than a year away is no forecast', () => {
  assert.equal(forecastMilestone(1_200, lastDays(28, 1), now), null)
})

test('the very first round numbers count too', () => {
  assert.deepEqual(forecastMilestone(60, lastDays(28, 10), now), { index: 100, days: 4 })
})

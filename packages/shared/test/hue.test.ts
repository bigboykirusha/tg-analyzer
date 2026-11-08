import assert from 'node:assert/strict'
import { test } from 'node:test'
import { telegramHueIndex } from '../src/analytics/hue'

test('a person gets the colour family Telegram gives them: abs(peer id) % 7, 1-based', () => {
  assert.equal(telegramHueIndex('1001'), (1001 % 7) + 1)
  assert.equal(telegramHueIndex(7), 1)
  // Supergroups and channels drop their «-100» prefix, basic groups their sign.
  assert.equal(telegramHueIndex('-1002001'), (2001 % 7) + 1)
  assert.equal(telegramHueIndex('-42'), (42 % 7) + 1)
})

test('a non-numeric seed falls back to a stable hash in range', () => {
  const index = telegramHueIndex('example')
  assert.ok(index >= 1 && index <= 7)
  assert.equal(telegramHueIndex('example'), index)
  assert.ok(telegramHueIndex(null) >= 1)
})

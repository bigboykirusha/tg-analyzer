import test from 'node:test'
import assert from 'node:assert/strict'
import { buildApiPath } from '@tg-analyzer/shared'

test('buildApiPath encodes required route params and rejects incomplete or unused params', () => {
  assert.equal(buildApiPath('/api/v1/stats/chats/:chatId', { chatId: '-123/a' }), '/api/v1/stats/chats/-123%2Fa')
  assert.throws(() => buildApiPath('/api/v1/parse/history/:jobId', {}), /Missing route parameter: jobId/)
  assert.throws(() => buildApiPath('/api/v1/stats/global', { chatId: '123' }), /Unexpected route parameter: chatId/)
})

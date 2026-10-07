import test from 'node:test'
import assert from 'node:assert/strict'
import { loggerOptions } from './logger.service'

test('request and error serializers omit query credentials and error details', () => {
  assert.deepEqual(
    loggerOptions.serializers.req({
      id: 'request-1',
      method: 'GET',
      url: '/ws/parse-progress?ticket=private-ticket',
    }),
    { id: 'request-1', method: 'GET', path: '/ws/parse-progress' },
  )
  assert.deepEqual(loggerOptions.serializers.err({ name: 'PrivateTelegramError' }), {
    type: 'PrivateTelegramError',
    message: 'Operation failed',
    stack: '',
  })
})

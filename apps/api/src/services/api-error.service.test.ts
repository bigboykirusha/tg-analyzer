import test from 'node:test'
import assert from 'node:assert/strict'
import { createApiError, serializeApiError } from './api-error.service'

test('internal database errors never expose SQL statements or bound parameters', () => {
  const secret = 'encrypted-telegram-session-payload'
  const error = new Error(`Failed query: INSERT INTO telegram_sessions ... params: ${secret}`)

  assert.deepEqual(serializeApiError(error, 'req-test'), {
    statusCode: 500,
    body: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId: 'req-test',
    },
  })
})

test('client-safe API errors retain their message and code', () => {
  assert.deepEqual(serializeApiError(createApiError(401, 'Telegram code expired', 'AUTH_CODE_EXPIRED'), 'req-auth'), {
    statusCode: 401,
    body: {
      message: 'Telegram code expired',
      code: 'AUTH_CODE_EXPIRED',
      requestId: 'req-auth',
    },
  })
})

test('Fastify plugin error objects preserve safe 4xx status and code', () => {
  assert.deepEqual(
    serializeApiError({ statusCode: 429, message: 'Too many requests', code: 'RATE_LIMITED' }, 'req-limit'),
    {
      statusCode: 429,
      body: {
        message: 'Too many requests',
        code: 'RATE_LIMITED',
        requestId: 'req-limit',
      },
    },
  )
})

test('validation errors use one stable client message', () => {
  const error = Object.assign(new Error('secret field value'), { name: 'ZodError' })
  assert.deepEqual(serializeApiError(error, 'req-validation'), {
    statusCode: 400,
    body: {
      message: 'Request validation failed',
      code: 'INVALID_REQUEST',
      requestId: 'req-validation',
    },
  })
})

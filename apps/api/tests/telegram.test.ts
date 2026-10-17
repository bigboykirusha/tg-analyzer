import './setup'
import test from 'node:test'
import assert from 'node:assert/strict'

import type { TelegramFloodWaitError, TelegramLoginError } from '../src/telegram/errors'

const errors = await import('../src/telegram/errors')
const { normalizeTelegramError, TelegramBusyError, TelegramSessionRevokedError } = errors
const { toMessageInput } = await import('../src/telegram/mapping')

test('raw Telegram errors are normalised', () => {
  const flood = normalizeTelegramError({
    errorMessage: 'FLOOD_WAIT',
    seconds: 42,
    message: 'A wait of 42 seconds is required (caused by FLOOD)',
  })
  assert.ok(flood instanceof errors.TelegramFloodWaitError)
  assert.equal(flood.seconds, 42)
  assert.equal((normalizeTelegramError(new Error('FLOOD_WAIT_17')) as TelegramFloodWaitError).seconds, 17)
  assert.ok(normalizeTelegramError({ errorMessage: 'AUTH_KEY_UNREGISTERED' }) instanceof TelegramSessionRevokedError)
  assert.ok(normalizeTelegramError({ errorMessage: 'AUTH_KEY_DUPLICATED' }) instanceof TelegramBusyError)
  assert.equal(
    (normalizeTelegramError({ errorMessage: 'PHONE_CODE_EXPIRED' }) as TelegramLoginError).reason,
    'code_expired',
  )
  const unknown = new Error('socket hang up')
  assert.equal(normalizeTelegramError(unknown), unknown)
})

test('gramjs messages are projected onto analysis metadata', () => {
  const base = {
    className: 'Message',
    id: 7,
    date: 1767225600,
    out: true,
    message: 'hello',
    senderId: 99n,
    replyTo: { replyToMsgId: 5 },
  }
  assert.deepEqual(toMessageInput({ ...base, _sender: { firstName: 'Ann', lastName: 'Lee' } } as never), {
    id: '7',
    date: new Date('2026-01-01T00:00:00.000Z'),
    outgoing: true,
    text: 'hello',
    senderId: '99',
    senderName: 'Ann Lee',
    replyToId: '5',
    kind: 'text',
  })
  assert.equal(
    toMessageInput({ ...base, media: { className: 'MessageMediaPhoto' }, photo: {} } as never)?.kind,
    'media',
  )
  assert.equal(
    toMessageInput({ ...base, media: { className: 'MessageMediaDocument' }, voice: {}, document: {} } as never)?.kind,
    'voice',
  )
  assert.equal(
    toMessageInput({ ...base, media: { className: 'MessageMediaDocument' }, document: {} } as never)?.kind,
    'file',
  )
  assert.equal(toMessageInput({ ...base, media: { className: 'MessageMediaWebPage' } } as never)?.kind, 'text')
  assert.equal(toMessageInput({ className: 'MessageService', id: 1 } as never), null)
})

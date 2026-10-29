import './setup'
import test from 'node:test'
import assert from 'node:assert/strict'

import type { TelegramFloodWaitError, TelegramLoginError } from '../src/telegram/errors'

const errors = await import('../src/telegram/errors')
const { normalizeTelegramError, TelegramBusyError, TelegramSessionRevokedError } = errors
const { imageDataUrl, toMessageInput } = await import('../src/telegram/mapping')
const { createLemmatizer } = await import('../src/lib/lemmatizer')

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
    durationSec: null,
    round: false,
    reactions: undefined,
    sticker: null,
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

test('voice length, video notes, reactions and stickers are read from gramjs messages', () => {
  const base = { className: 'Message', id: 8, date: 1767225600, out: false, message: '', senderId: 5n }
  const voice = toMessageInput({
    ...base,
    media: { className: 'MessageMediaDocument' },
    voice: { attributes: [{ className: 'DocumentAttributeAudio', duration: 41.6, voice: true }] },
    document: {},
    reactions: {
      results: [
        { reaction: { className: 'ReactionEmoji', emoticon: '❤' }, count: 1, chosenOrder: 0 },
        { reaction: { className: 'ReactionCustomEmoji', documentId: 1n }, count: 2 },
      ],
    },
  } as never)
  assert.equal(voice?.kind, 'voice')
  assert.equal(voice?.durationSec, 42)
  assert.deepEqual(voice?.reactions, [
    { emoji: '❤', count: 1, mine: true },
    { emoji: 'custom', count: 2, mine: false },
  ])

  const round = toMessageInput({
    ...base,
    media: { className: 'MessageMediaDocument' },
    videoNote: { attributes: [{ className: 'DocumentAttributeVideo', duration: 12, roundMessage: true }] },
    video: {},
    document: {},
  } as never)
  assert.equal(round?.kind, 'media')
  assert.equal(round?.round, true)
  assert.equal(round?.durationSec, 12)

  const sticker = toMessageInput({
    ...base,
    media: { className: 'MessageMediaDocument' },
    sticker: {
      id: 77n,
      attributes: [
        { className: 'DocumentAttributeSticker', alt: '😺', stickerset: { className: 'InputStickerSetID', id: 9n } },
      ],
    },
    document: {},
  } as never)
  assert.deepEqual(sticker?.sticker, { id: '77', emoji: '😺', setId: '9' })
})

test('sticker previews become data URLs only for small web images', () => {
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')])
  assert.match(imageDataUrl(webp) ?? '', /^data:image\/webp;base64,/)
  assert.equal(imageDataUrl(Buffer.from('not an image')), null)
  assert.equal(imageDataUrl(Buffer.concat([webp, Buffer.alloc(64 * 1024)])), null)
})

test('words are grouped by dictionary lemma, function words are dropped', async () => {
  const lemma = await createLemmatizer()
  assert.equal(lemma('люблю'), 'любить')
  assert.equal(lemma('любит'), 'любить')
  assert.equal(lemma('работы'), 'работа')
  assert.equal(lemma('пошла'), 'пойти')
  assert.equal(lemma('около'), null)
  // Slang the dictionary does not know falls back to the stem.
  assert.equal(lemma('созвона'), lemma('созвоны'))
  assert.equal(lemma('hello'), 'hello')
})

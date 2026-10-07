import test from 'node:test'
import assert from 'node:assert/strict'
import {
  sendCodeBodySchema,
  shareReportBodySchema,
  topQuerySchema,
  updateProfileBodySchema,
  verifyCodeBodySchema,
  verifyPasswordBodySchema,
} from '@tg-analyzer/shared'

test('shared request schemas validate auth bounds and profile input', () => {
  assert.equal(sendCodeBodySchema.safeParse({ phone: '+15551234567' }).success, true)
  assert.equal(sendCodeBodySchema.safeParse({ phone: '123' }).success, false)
  assert.equal(
    verifyCodeBodySchema.safeParse({ phone: '+15551234567', code: '123', phoneCodeHash: 'hash' }).success,
    true,
  )
  assert.equal(
    verifyCodeBodySchema.safeParse({ phone: '+15551234567', code: 'ab', phoneCodeHash: 'hash' }).success,
    false,
  )
  assert.equal(verifyPasswordBodySchema.safeParse({ password: 'valid' }).success, true)
  assert.equal(verifyPasswordBodySchema.safeParse({ password: '' }).success, false)
  assert.equal(updateProfileBodySchema.safeParse({ timezone: 'Europe/Moscow' }).success, true)
  assert.equal(updateProfileBodySchema.safeParse({ timezone: '' }).success, false)
})

test('shared report and top query schemas apply endpoint defaults and bounds', () => {
  const report = shareReportBodySchema.parse({
    chatId: '-42',
    fileName: 'report.pdf',
    base64: 'ZmlsZQ==',
  })
  assert.equal(report.mimeType, 'application/pdf')
  assert.equal(shareReportBodySchema.safeParse({ ...report, chatId: 'not-a-chat' }).success, false)
  assert.deepEqual(topQuerySchema.parse({ type: 'words', limit: '12' }), { type: 'words', limit: 12 })
  assert.equal(topQuerySchema.safeParse({ type: 'unknown', limit: 12 }).success, false)
})

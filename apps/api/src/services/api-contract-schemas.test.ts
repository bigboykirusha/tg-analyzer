import test from 'node:test'
import assert from 'node:assert/strict'
import {
  authSuccessResponseSchema,
  clearHistoryResponseSchema,
  deleteResponseSchema,
  pendingPasswordResponseSchema,
  sendCodeBodySchema,
  startParseResponseSchema,
  shareReportBodySchema,
  topQuerySchema,
  updateProfileBodySchema,
  verifyCodeBodySchema,
  verifyPasswordBodySchema,
  wsAuthTicketResponseSchema,
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

test('shared auth response schemas reject incomplete transport payloads', () => {
  const user = {
    id: 'user-id',
    tgUserId: '42',
    username: null,
    firstName: 'Ada',
    timezone: 'UTC',
    telegramSessionActive: true,
  }

  assert.equal(authSuccessResponseSchema.safeParse({ accessToken: 'token', user }).success, true)
  assert.equal(authSuccessResponseSchema.safeParse({ accessToken: 'token' }).success, false)
  assert.equal(pendingPasswordResponseSchema.safeParse({ isPasswordRequired: true, tempToken: 'temp' }).success, true)
  assert.equal(wsAuthTicketResponseSchema.safeParse({ ticket: '' }).success, false)
  assert.equal(deleteResponseSchema.safeParse({ success: true }).success, true)
  assert.equal(deleteResponseSchema.safeParse({ success: false }).success, false)
  assert.equal(startParseResponseSchema.safeParse({ jobId: '00000000-0000-4000-8000-000000000000' }).success, true)
  assert.equal(clearHistoryResponseSchema.safeParse({ success: true, deleted: -1 }).success, false)
})

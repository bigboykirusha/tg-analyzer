import test from 'node:test'
import assert from 'node:assert/strict'
import type { NotificationsResponse, PublicQuizDto, ShareLinkDto } from '@tg-analyzer/shared'
import { ORIGIN, app, login, pool, processJob, useTestServer, type Session } from './helpers'

// After the helpers: they set up the test environment before the app's config is first read.
const { notifyExpiringLinks } = await import('../src/modules/notify/notifications')

useTestServer()

const CHAT = '1002' // «Мама»: a chat with a clear quiz

function send(session: Session | null, method: 'POST' | 'DELETE', url: string, payload?: object) {
  return app.inject({ method, url, headers: { ...(session?.headers ?? {}), origin: ORIGIN }, payload })
}

async function list(session: Session) {
  return (await app.inject({ url: '/api/v1/notifications', headers: session.headers })).json<NotificationsResponse>()
}

async function analysed(phone: string) {
  const session = await login(phone)
  const started = await send(session, 'POST', '/api/v1/parse/start', { chatId: CHAT })
  assert.equal(started.statusCode, 200, started.body)
  await processJob(session.userId, started.json<{ jobId: string }>().jobId)
  return session
}

test('a finished analysis is a notification; opening the page reads it', async () => {
  const session = await analysed('+79990000301')
  const first = await list(session)
  assert.equal(first.unread, 1)
  assert.equal(first.notifications[0]?.kind, 'report_ready')
  assert.equal(first.notifications[0]?.chatId, CHAT)
  assert.equal(first.notifications[0]?.read, false)

  assert.equal((await send(session, 'POST', '/api/v1/notifications/read')).statusCode, 200)
  const unread = await app.inject({ url: '/api/v1/notifications/unread', headers: session.headers })
  assert.equal(unread.json<{ unread: number }>().unread, 0)
  assert.equal((await list(session)).notifications[0]?.read, true)
})

test('a quiz answer keeps the guest’s choice about the score', async () => {
  const session = await analysed('+79990000302')
  const { token } = (
    await send(session, 'POST', `/api/v1/reports/${CHAT}/links`, { kind: 'quiz', days: 7 })
  ).json<ShareLinkDto>()
  const quiz = (await app.inject({ url: `/api/v1/public/${token}` })).json<PublicQuizDto>()
  const picks = quiz.questions.map((question) => question.answer)
  assert.equal((await send(null, 'POST', `/api/v1/public/${token}/answer`, { picks, share: false })).statusCode, 200)

  await waitFor(async () => (await list(session)).notifications.some((item) => item.kind === 'quiz_answered'))
  const answered = (await list(session)).notifications.find((item) => item.kind === 'quiz_answered')
  assert.ok(answered && answered.kind === 'quiz_answered')
  assert.equal(answered.score, null)
  assert.equal(answered.total, quiz.questions.length)
})

test('the report link opened by someone else is news once; the owner’s own look is not', async () => {
  const session = await analysed('+79990000303')
  const { token } = (
    await send(session, 'POST', `/api/v1/reports/${CHAT}/links`, { kind: 'report', days: 7 })
  ).json<ShareLinkDto>()

  await app.inject({ url: `/api/v1/public/${token}`, headers: session.headers })
  await sleep(200)
  assert.equal((await list(session)).notifications.filter((item) => item.kind === 'link_opened').length, 0)

  await app.inject({ url: `/api/v1/public/${token}` })
  await app.inject({ url: `/api/v1/public/${token}` })
  await waitFor(async () => (await list(session)).notifications.some((item) => item.kind === 'link_opened'))
  await sleep(200)
  assert.equal((await list(session)).notifications.filter((item) => item.kind === 'link_opened').length, 1)
})

test('a link about to expire warns once, and deleting the report takes its notifications', async () => {
  const session = await analysed('+79990000304')
  assert.equal(
    (await send(session, 'POST', `/api/v1/reports/${CHAT}/links`, { kind: 'report', days: 7 })).statusCode,
    200,
  )
  await pool.query(
    `UPDATE share_links SET expires_at = now() + interval '2 days'
     WHERE report_id IN (SELECT id FROM chat_reports WHERE user_id = $1)`,
    [session.userId],
  )
  await notifyExpiringLinks()
  await notifyExpiringLinks()
  const expiring = (await list(session)).notifications.filter((item) => item.kind === 'link_expiring')
  assert.equal(expiring.length, 1)

  assert.equal((await send(session, 'DELETE', `/api/v1/reports/${CHAT}`)).statusCode, 200)
  assert.deepEqual((await list(session)).notifications, [])
})

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Notifications from public routes are recorded after the response; give them a moment. */
async function waitFor(check: () => Promise<boolean>) {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (await check()) return
    await sleep(100)
  }
  assert.fail('the notification never came')
}

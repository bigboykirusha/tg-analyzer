import test from 'node:test'
import assert from 'node:assert/strict'
import type { PublicQuizDto, PublicReportDto, ShareLinkDto, ShareLinksResponse } from '@tg-analyzer/shared'
import { ORIGIN, app, login, processJob, useTestServer, type Session } from './helpers'

useTestServer()

const CHAT = '1002' // «Мама»: 1 900 generated messages, a clear quiz

function send(session: Session | null, method: 'POST' | 'DELETE', url: string, payload?: object) {
  return app.inject({ method, url, headers: { ...(session?.headers ?? {}), origin: ORIGIN }, payload })
}

async function analysed() {
  const session = await login('+79990000077')
  const started = await send(session, 'POST', '/api/v1/parse/start', { chatId: CHAT })
  assert.equal(started.statusCode, 200, started.body)
  await processJob(session.userId, started.json<{ jobId: string }>().jobId)
  return session
}

test('a report link shows only what the owner allowed, to anyone, until it is turned off', async () => {
  const session = await analysed()
  const made = await send(session, 'POST', `/api/v1/reports/${CHAT}/links`, { kind: 'report', days: 7 })
  assert.equal(made.statusCode, 200, made.body)
  const link = made.json<ShareLinkDto>()

  const opened = await app.inject({ url: `/api/v1/public/${link.token}` })
  assert.equal(opened.statusCode, 200)
  const page = opened.json<PublicReportDto>()
  assert.equal(page.kind, 'report')
  // No name, no Telegram ids, no words by default.
  assert.equal(page.data.summary.title, '')
  assert.notEqual(page.data.summary.chatId, CHAT)
  assert.ok(!opened.body.includes(`"${CHAT}"`))
  assert.ok(page.data.report.milestones?.every((milestone) => !milestone.messageId && !milestone.senderId))
  assert.deepEqual(page.data.report.vocabulary.topWords, [])

  const list = await app.inject({ url: `/api/v1/reports/${CHAT}/links`, headers: session.headers })
  assert.equal(list.json<ShareLinksResponse>().links[0]?.views, 1)

  assert.equal((await send(session, 'DELETE', `/api/v1/reports/${CHAT}/links/report`)).statusCode, 200)
  assert.equal((await app.inject({ url: `/api/v1/public/${link.token}` })).statusCode, 404)
})

test('the quiz is answered once, and the owner sees the score only with consent', async () => {
  const session = await analysed()
  const made = await send(session, 'POST', `/api/v1/reports/${CHAT}/links`, { kind: 'quiz', days: 7 })
  assert.equal(made.statusCode, 200, made.body)
  const { token } = made.json<ShareLinkDto>()

  const quiz = (await app.inject({ url: `/api/v1/public/${token}` })).json<PublicQuizDto>()
  assert.ok(quiz.questions.length >= 3)
  const picks = quiz.questions.map((question) => question.answer)
  const answered = await send(null, 'POST', `/api/v1/public/${token}/answer`, { picks, share: false })
  assert.equal(answered.statusCode, 200, answered.body)
  assert.equal(answered.json<PublicQuizDto>().answered?.score, quiz.questions.length)

  const again = await send(null, 'POST', `/api/v1/public/${token}/answer`, { picks, share: true })
  assert.equal(again.statusCode, 409)

  const owner = (
    await app.inject({ url: `/api/v1/reports/${CHAT}/links`, headers: session.headers })
  ).json<ShareLinksResponse>()
  const result = owner.links.find((link) => link.kind === 'quiz')?.result
  assert.equal(result?.score, null)
  assert.equal(result?.correct, null)
})

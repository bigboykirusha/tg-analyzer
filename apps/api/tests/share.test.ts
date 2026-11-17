import test from 'node:test'
import assert from 'node:assert/strict'
import {
  QUIZ_LENGTH,
  telegramHueIndex,
  type ApiErrorResponse,
  type PublicQuizDto,
  type PublicReportDto,
  type ShareLinkDto,
  type ShareLinksResponse,
} from '@tg-analyzer/shared'
import { eq } from 'drizzle-orm'
import * as schema from '../src/db/schema'
import { ORIGIN, app, db, login, processJob, useTestServer, type Session } from './helpers'

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
  // Switched off means switched off in the derived words and favourites too.
  assert.equal(page.data.derived.words.wordOfChat, null)
  assert.deepEqual(page.data.derived.words.topWords, [])
  assert.deepEqual(page.data.derived.favourites.topEmoji, [])
  // The id is hidden, the colour is not: the guest sees the person in the colour the owner does.
  assert.equal(page.hue, telegramHueIndex(CHAT))

  const list = await app.inject({ url: `/api/v1/reports/${CHAT}/links`, headers: session.headers })
  assert.equal(list.json<ShareLinksResponse>().links[0]?.views, 1)

  assert.equal((await send(session, 'DELETE', `/api/v1/reports/${CHAT}/links/report`)).statusCode, 200)
  assert.equal((await app.inject({ url: `/api/v1/public/${link.token}` })).statusCode, 404)
})

test('an expired link says so (410), a deleted one is not found (404)', async () => {
  const session = await analysed()
  const made = await send(session, 'POST', `/api/v1/reports/${CHAT}/links`, { kind: 'report', days: 30 })
  const link = made.json<ShareLinkDto>()
  await db
    .update(schema.shareLinks)
    .set({ expiresAt: new Date(Date.now() - 1000) })
    .where(eq(schema.shareLinks.token, link.token))
  const expired = await app.inject({ url: `/api/v1/public/${link.token}` })
  assert.equal(expired.statusCode, 410)
  assert.equal(expired.json<ApiErrorResponse>().code, 'LINK_EXPIRED')
  assert.equal((await app.inject({ url: '/api/v1/public/no-such-token-here' })).statusCode, 404)
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

test('two answers at the same moment: one lands, the other is told the quiz is answered', async () => {
  const session = await analysed()
  const made = await send(session, 'POST', `/api/v1/reports/${CHAT}/links`, { kind: 'quiz', days: 7 })
  const { token } = made.json<ShareLinkDto>()
  const quiz = (await app.inject({ url: `/api/v1/public/${token}` })).json<PublicQuizDto>()
  const right = quiz.questions.map((question) => question.answer)
  const wrong = right.map((pick) => (pick === 'author' ? 'guest' : 'author'))
  const answers = await Promise.all([
    send(null, 'POST', `/api/v1/public/${token}/answer`, { picks: right, share: true }),
    send(null, 'POST', `/api/v1/public/${token}/answer`, { picks: wrong, share: true }),
  ])
  assert.deepEqual(answers.map((answer) => answer.statusCode).sort(), [200, 409])
  const kept = answers.find((answer) => answer.statusCode === 200)!.json<PublicQuizDto>().answered?.score
  const owner = (
    await app.inject({ url: `/api/v1/reports/${CHAT}/links`, headers: session.headers })
  ).json<ShareLinksResponse>()
  assert.equal(owner.links.find((link) => link.kind === 'quiz')?.result?.score, kept)
})

test('a week after it runs out a link is deleted with its snapshot; a fresh one stays', async () => {
  const { deleteExpiredLinks } = await import('../src/modules/share/repository')
  const session = await analysed()
  const old = (
    await send(session, 'POST', `/api/v1/reports/${CHAT}/links`, { kind: 'report', days: 7 })
  ).json<ShareLinkDto>()
  const live = (
    await send(session, 'POST', `/api/v1/reports/${CHAT}/links`, { kind: 'quiz', days: 7 })
  ).json<ShareLinkDto>()
  await db
    .update(schema.shareLinks)
    .set({ expiresAt: new Date(Date.now() - 8 * 86_400_000) })
    .where(eq(schema.shareLinks.token, old.token))
  await deleteExpiredLinks()
  const left = await db.select({ token: schema.shareLinks.token }).from(schema.shareLinks)
  assert.ok(!left.some((row) => row.token === old.token))
  assert.ok(left.some((row) => row.token === live.token))
})

test('a link has a preview picture that counts no view', async () => {
  const session = await analysed()
  const made = await send(session, 'POST', `/api/v1/reports/${CHAT}/links`, { kind: 'report', days: 30 })
  const link = made.json<ShareLinkDto>()
  const card = await app.inject({ url: `/api/v1/public/${link.token}/card.png?lang=en` })
  assert.equal(card.statusCode, 200)
  assert.equal(card.headers['content-type'], 'image/png')
  const png = card.rawPayload
  assert.equal(png.subarray(1, 4).toString(), 'PNG')
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630])
  const list = await app.inject({ url: `/api/v1/reports/${CHAT}/links`, headers: session.headers })
  assert.equal(list.json<ShareLinksResponse>().links[0]?.views, 0)
})

test('a quiz asks up to ten questions, and a link made with the old bets still opens and counts', async () => {
  const session = await analysed()
  const made = await send(session, 'POST', `/api/v1/reports/${CHAT}/links`, { kind: 'quiz', days: 7 })
  assert.equal(made.statusCode, 200, made.body)
  const link = made.json<ShareLinkDto>()
  assert.ok(link.questions!.length > 5 && link.questions!.length <= QUIZ_LENGTH)
  // Before 17.11 the author could bet first; such payloads stay in the database and are ignored.
  const [row] = await db.select().from(schema.shareLinks).where(eq(schema.shareLinks.token, link.token))
  await db
    .update(schema.shareLinks)
    .set({
      payload: {
        ...row!.payload,
        authorPicks: link.questions!.map(() => 'mine'),
      } as unknown as schema.ShareLinkPayload,
    })
    .where(eq(schema.shareLinks.token, link.token))
  const opened = await app.inject({ url: `/api/v1/public/${link.token}` })
  assert.equal(opened.statusCode, 200)
  assert.ok(!opened.body.includes('authorPicks'))
  const picks = opened.json<PublicQuizDto>().questions.map((question) => question.answer)
  await send(null, 'POST', `/api/v1/public/${link.token}/answer`, { picks, share: true })
  const owner = (
    await app.inject({ url: `/api/v1/reports/${CHAT}/links`, headers: session.headers })
  ).json<ShareLinksResponse>()
  assert.equal(owner.links.find((item) => item.kind === 'quiz')?.result?.score, picks.length)
})

const GROUP = '-1002001' // «Продуктовая команда»: a demo group

async function analysedGroup() {
  const session = await login('+79990000078')
  const started = await send(session, 'POST', '/api/v1/parse/start', { chatId: GROUP })
  assert.equal(started.statusCode, 200, started.body)
  await processJob(session.userId, started.json<{ jobId: string }>().jobId)
  return session
}

test("a group report link hides the members' Telegram ids always, names and pairs by default, words on request", async () => {
  const session = await analysedGroup()
  const own = (await app.inject({ url: `/api/v1/reports/${GROUP}`, headers: session.headers })).json<{
    report: { group: { participants: { id: string; name: string }[] } }
  }>()
  const realIds = own.report.group.participants.map((member) => member.id)

  const made = await send(session, 'POST', `/api/v1/reports/${GROUP}/links`, { kind: 'report', days: 7 })
  assert.equal(made.statusCode, 200, made.body)
  const hidden = await app.inject({ url: `/api/v1/public/${made.json<ShareLinkDto>().token}` })
  const page = hidden.json<PublicReportDto>()
  const group = page.data.report.group!
  assert.ok(group.participants.length > 2)
  assert.ok(
    group.participants.every((member) => /^p\d+$/.test(member.id)),
    'ids are p1, p2, …',
  )
  assert.ok(
    group.participants.every((member) => member.name === ''),
    'no names by default',
  )
  assert.deepEqual(group.topPairs, [])
  assert.deepEqual(group.sharedVocabulary, [])
  assert.ok(group.participants.every((member) => member.topWords.length === 0 && member.topEmoji.length === 0))
  assert.equal(page.data.summary.title, '')
  assert.equal(page.author, '', "the owner's own name does not leave with names off")
  for (const id of realIds) assert.ok(!hidden.body.includes(`"${id}"`), `real id ${id} must not leave`)

  // Names and words on: the names and the pairs come, the ids stay hidden and consistent.
  const shown = await send(session, 'POST', `/api/v1/reports/${GROUP}/links`, {
    kind: 'report',
    days: 7,
    settings: { showName: true, words: true, stickers: true },
  })
  const open = await app.inject({ url: `/api/v1/public/${shown.json<ShareLinkDto>().token}` })
  const full = open.json<PublicReportDto>().data.report.group!
  assert.ok(full.participants.some((member) => member.name !== ''))
  assert.ok(full.participants.every((member) => /^p\d+$/.test(member.id)))
  const ids = new Set(full.participants.map((member) => member.id))
  assert.equal(ids.size, full.participants.length, 'one alias per member')
  assert.ok(full.topPairs.every((pair) => ids.has(pair.leftParticipantId) && ids.has(pair.rightParticipantId)))
  for (const id of realIds) assert.ok(!open.body.includes(`"${id}"`), `real id ${id} must not leave`)
  assert.ok(full.participants.some((member) => member.topWords.length > 0))
})

test('a group has no quiz', async () => {
  const session = await analysedGroup()
  const made = await send(session, 'POST', `/api/v1/reports/${GROUP}/links`, { kind: 'quiz', days: 7 })
  assert.equal(made.statusCode, 422)
})

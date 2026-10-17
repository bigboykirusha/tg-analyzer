import test from 'node:test'
import assert from 'node:assert/strict'
import type { ParseProgressDto, ReportDto } from '@tg-analyzer/shared'
import { ORIGIN, analysisQueue, app, login, pool, processJob, redis, useTestServer, type Session } from './helpers'

useTestServer()

const { reconcileActiveJobs } = await import('../src/modules/parse/reconcile')

const PRIVATE_CHAT = '1006' // "Катя": 130 generated messages
const GROUP_CHAT = '-1002004' // "Weekend plans": 420 generated messages

function post(session: Session, url: string, payload?: object) {
  return app.inject({ method: 'POST', url, headers: { ...session.headers, origin: ORIGIN }, payload })
}

async function analyse(session: Session, chatId: string) {
  const started = await post(session, '/api/v1/parse/start', { chatId })
  assert.equal(started.statusCode, 200, started.body)
  const { jobId } = started.json<{ jobId: string }>()
  await processJob(session.userId, jobId)
  return jobId
}

test('dialogs come from Telegram and are cached for busy periods', async () => {
  const session = await login()
  const response = await app.inject({ url: '/api/v1/parse/dialogs', headers: session.headers })
  assert.equal(response.statusCode, 200)
  const body = response.json()
  assert.equal(body.stale, false)
  assert.ok(
    body.dialogs.some(
      (dialog: { id: string; type: string }) => dialog.id === PRIVATE_CHAT && dialog.type === 'private',
    ),
  )

  // Simulate a running analysis holding the Telegram session.
  await redis.set(`telegram:lease:${session.userId}`, 'worker', 'PX', 60_000)
  const busy = await app.inject({ url: '/api/v1/parse/dialogs', headers: session.headers })
  assert.equal(busy.statusCode, 200)
  assert.equal(busy.json().stale, true)
})

test('a private chat analysis produces a report and starts a cooldown', async () => {
  const session = await login()
  const jobId = await analyse(session, PRIVATE_CHAT)

  const list = await app.inject({ url: '/api/v1/reports', headers: session.headers })
  assert.deepEqual(
    list.json().reports.map((report: { chatId: string; type: string }) => [report.chatId, report.type]),
    [[PRIVATE_CHAT, 'private']],
  )

  const report = (
    await app.inject({ url: `/api/v1/reports/${PRIVATE_CHAT}`, headers: session.headers })
  ).json<ReportDto>()
  assert.equal(report.summary.title, 'Катя')
  assert.equal(report.report.totals.messages, 130)
  assert.equal(report.report.activity.hourly.length, 24)
  assert.ok(report.report.relationship)
  assert.equal(report.report.group, null)
  assert.ok(report.derived.availabilityProfile.activeHours > 0)

  const history = (await app.inject({ url: '/api/v1/parse/history', headers: session.headers })).json()
  assert.equal(history.total, 1)
  assert.equal(history.items[0].jobId, jobId)
  assert.equal(history.items[0].status, 'completed')
  assert.equal(history.items[0].totalMessages, 130)

  const status = (await app.inject({ url: '/api/v1/parse/status', headers: session.headers })).json<ParseProgressDto>()
  assert.equal(status.status, 'idle')

  const again = await post(session, '/api/v1/parse/start', { chatId: PRIVATE_CHAT })
  assert.equal(again.statusCode, 429)
  assert.equal(again.json().code, 'PARSE_COOLDOWN')
  assert.ok(again.json().retryAfter > 0)
})

test('a group analysis includes participants and reports are isolated per user', async () => {
  const owner = await login('+79990000011')
  const stranger = await login('+79990000012')
  await analyse(owner, GROUP_CHAT)

  const report = (await app.inject({ url: `/api/v1/reports/${GROUP_CHAT}`, headers: owner.headers })).json<ReportDto>()
  assert.equal(report.summary.type, 'group')
  assert.ok((report.report.group?.participants.length ?? 0) >= 3)
  assert.equal(report.report.relationship, null)

  const foreign = await app.inject({ url: `/api/v1/reports/${GROUP_CHAT}`, headers: stranger.headers })
  assert.equal(foreign.statusCode, 404)
  const foreignDelete = await app.inject({
    method: 'DELETE',
    url: `/api/v1/reports/${GROUP_CHAT}`,
    headers: { ...stranger.headers, origin: ORIGIN },
  })
  assert.equal(foreignDelete.statusCode, 404)

  const deleted = await app.inject({
    method: 'DELETE',
    url: `/api/v1/reports/${GROUP_CHAT}`,
    headers: { ...owner.headers, origin: ORIGIN },
  })
  assert.equal(deleted.statusCode, 200)
  assert.equal((await app.inject({ url: '/api/v1/reports', headers: owner.headers })).json().reports.length, 0)
})

test('analyses queue up, one chat at a time, and channels are rejected', async () => {
  const session = await login()
  await app.inject({ url: '/api/v1/parse/dialogs', headers: session.headers })

  const channel = await post(session, '/api/v1/parse/start', { chatId: '-1003001' })
  assert.equal(channel.statusCode, 400)

  const first = await post(session, '/api/v1/parse/start', { chatId: PRIVATE_CHAT })
  assert.equal(first.statusCode, 200)
  // A second chat waits in the queue instead of being refused.
  const second = await post(session, '/api/v1/parse/start', { chatId: GROUP_CHAT })
  assert.equal(second.statusCode, 200)
  // The same chat cannot be queued twice.
  const duplicate = await post(session, '/api/v1/parse/start', { chatId: PRIVATE_CHAT })
  assert.equal(duplicate.statusCode, 409)
  assert.equal(duplicate.json().code, 'PARSE_ALREADY_QUEUED')

  const status = (await app.inject({ url: '/api/v1/parse/status', headers: session.headers })).json<ParseProgressDto>()
  assert.equal(status.status, 'pending')
  assert.equal(status.chatTitle, 'Катя')
  assert.deepEqual(
    status.queued?.map((item) => item.chatId),
    [GROUP_CHAT],
  )

  // Only one job of a user may run: the second one is told to wait while the first runs.
  const { jobId: firstJob } = first.json<{ jobId: string }>()
  const { jobId: secondJob } = second.json<{ jobId: string }>()
  await pool.query("UPDATE parse_jobs SET status = 'running' WHERE id = $1", [firstJob])
  const { markJobRunning } = await import('../src/modules/parse/jobs')
  assert.equal(await markJobRunning(secondJob), 'busy')

  // Cancelling a waiting job leaves the running one alone.
  const cancelled = await post(session, '/api/v1/parse/cancel', { jobId: secondJob })
  assert.equal(cancelled.statusCode, 200)
  const after = (await app.inject({ url: '/api/v1/parse/status', headers: session.headers })).json<ParseProgressDto>()
  assert.equal(after.jobId, firstJob)
  assert.deepEqual(after.queued, [])
})

test('a cancelled analysis stores nothing', async () => {
  const session = await login()
  const { jobId } = (await post(session, '/api/v1/parse/start', { chatId: PRIVATE_CHAT })).json()

  const cancelled = await post(session, '/api/v1/parse/cancel')
  assert.equal(cancelled.statusCode, 200)
  assert.equal(await analysisQueue().getJob(jobId), undefined, 'queued job removed')

  await processJob(session.userId, jobId)
  assert.equal((await app.inject({ url: '/api/v1/reports', headers: session.headers })).json().reports.length, 0)
  const history = (await app.inject({ url: '/api/v1/parse/history', headers: session.headers })).json()
  assert.equal(history.items[0].status, 'cancelled')

  assert.equal((await post(session, '/api/v1/parse/cancel')).json().code, 'PARSE_NOT_ACTIVE')
})

test('history items can be deleted, active ones cannot', async () => {
  const session = await login()
  const finished = await analyse(session, PRIVATE_CHAT)
  const { jobId: active } = (await post(session, '/api/v1/parse/start', { chatId: GROUP_CHAT })).json()

  const remove = (jobId: string) =>
    app.inject({
      method: 'DELETE',
      url: `/api/v1/parse/history/${jobId}`,
      headers: { ...session.headers, origin: ORIGIN },
    })
  assert.equal((await remove(active)).json().code, 'PARSE_JOB_ACTIVE')
  assert.equal((await remove(finished)).statusCode, 200)
  assert.equal((await remove(finished)).statusCode, 404)
})

test('a revoked Telegram session fails the analysis and asks to sign in again', async () => {
  const session = await login()
  const { jobId } = (await post(session, '/api/v1/parse/start', { chatId: PRIVATE_CHAT })).json()
  await pool.query('UPDATE telegram_sessions SET is_active = false')

  await assert.rejects(processJob(session.userId, jobId))
  const history = (await app.inject({ url: '/api/v1/parse/history', headers: session.headers })).json()
  assert.equal(history.items[0].status, 'failed')
  assert.equal(history.items[0].error, 'telegram_session_expired')

  const start = await post(session, '/api/v1/parse/start', { chatId: GROUP_CHAT })
  assert.equal(start.json().code, 'TELEGRAM_REAUTH_REQUIRED')
})

test('reconciliation re-queues active jobs that lost their queue entry', async () => {
  const session = await login()
  const { jobId } = (await post(session, '/api/v1/parse/start', { chatId: PRIVATE_CHAT })).json()
  await analysisQueue().obliterate({ force: true })
  assert.equal(await analysisQueue().getJob(jobId), undefined)

  await reconcileActiveJobs()
  assert.ok(await analysisQueue().getJob(jobId))
})

test('reports can be shared to Saved Messages as a PDF', async () => {
  const session = await login()
  const share = (body: Buffer) =>
    app.inject({
      method: 'POST',
      url: `/api/v1/reports/${PRIVATE_CHAT}/share?fileName=report.pdf`,
      headers: { ...session.headers, origin: ORIGIN, 'content-type': 'application/pdf' },
      payload: body,
    })
  assert.equal((await share(Buffer.from('%PDF-1.7 test'))).statusCode, 200)
  assert.equal((await share(Buffer.from('not a pdf'))).statusCode, 400)
})

test('avatars are fetched in batches and cached', async () => {
  const session = await login()
  const response = await post(session, '/api/v1/parse/avatars', { chatIds: [PRIVATE_CHAT, GROUP_CHAT] })
  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json().avatars, { [PRIVATE_CHAT]: null, [GROUP_CHAT]: null })
  assert.equal(await redis.get(`telegram:avatar:${session.userId}:${PRIVATE_CHAT}`), '-')

  const tooMany = await post(session, '/api/v1/parse/avatars', {
    chatIds: Array.from({ length: 31 }, (_, i) => String(i + 1)),
  })
  assert.equal(tooMany.statusCode, 400)
})

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

test("polling recovers a missed completion without exposing another user's job", async () => {
  const owner = await login('+79990000021')
  const stranger = await login('+79990000022')
  const jobId = await analyse(owner, PRIVATE_CHAT)
  const next = await post(owner, '/api/v1/parse/start', { chatId: GROUP_CHAT })
  const url = `/api/v1/parse/status?jobId=${jobId}`
  const result = (await app.inject({ url, headers: owner.headers })).json<ParseProgressDto>()
  assert.equal(result.status, 'completed')
  assert.equal(result.chatId, PRIVATE_CHAT)
  assert.equal(result.scannedMessages, 130)
  assert.equal(result.queued?.[0]?.jobId, next.json().jobId)

  const foreign = (await app.inject({ url, headers: stranger.headers })).json<ParseProgressDto>()
  assert.equal(foreign.status, 'idle')
  assert.equal(foreign.jobId, null)
  assert.equal(
    (await app.inject({ url: '/api/v1/parse/status?jobId=invalid', headers: owner.headers })).statusCode,
    400,
  )
})

test('polling recovers cancellation and failure after socket delivery was missed', async () => {
  const session = await login()
  const { jobId } = (await post(session, '/api/v1/parse/start', { chatId: PRIVATE_CHAT })).json()
  await post(session, '/api/v1/parse/cancel', { jobId })
  const url = `/api/v1/parse/status?jobId=${jobId}`
  assert.equal((await app.inject({ url, headers: session.headers })).json().status, 'cancelled')
  await pool.query("UPDATE parse_jobs SET status = 'failed', error_message = 'interrupted' WHERE id = $1", [jobId])
  const failed = (await app.inject({ url, headers: session.headers })).json<ParseProgressDto>()
  assert.equal(failed.status, 'failed')
  assert.equal(failed.error, 'interrupted')
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

test('a re-analysis keeps the previous headline numbers for «what changed»', async () => {
  const session = await login()
  await analyse(session, PRIVATE_CHAT)
  const first = (
    await app.inject({ url: `/api/v1/reports/${PRIVATE_CHAT}`, headers: session.headers })
  ).json<ReportDto>()
  assert.equal(first.previous, null)

  // Skip the cooldown that normally separates two analyses of one chat.
  await redis.del(`parse:cooldown:${session.userId}:${PRIVATE_CHAT}`)
  await analyse(session, PRIVATE_CHAT)
  const second = (
    await app.inject({ url: `/api/v1/reports/${PRIVATE_CHAT}`, headers: session.headers })
  ).json<ReportDto>()
  assert.ok(second.previous)
  assert.equal(second.previous.messages, first.report.totals.messages)
  assert.equal(second.previous.sent, first.report.totals.sent)
  assert.equal(second.previous.analyzedAt, first.summary.analyzedAt)
})

test('the free plan stops new analyses after the daily limit', async () => {
  const { config } = await import('../src/config')
  const previous = config.FREE_ANALYSES_PER_DAY
  ;(config as { FREE_ANALYSES_PER_DAY?: number }).FREE_ANALYSES_PER_DAY = 1
  try {
    const session = await login()
    await analyse(session, PRIVATE_CHAT)
    const second = await post(session, '/api/v1/parse/start', { chatId: GROUP_CHAT })
    assert.equal(second.statusCode, 429)
    assert.equal(second.json<{ code: string }>().code, 'PARSE_DAILY_LIMIT')
  } finally {
    ;(config as { FREE_ANALYSES_PER_DAY?: number }).FREE_ANALYSES_PER_DAY = previous
  }
})

test('clearing history does not reset the daily analysis limit', async () => {
  const { config } = await import('../src/config')
  const previous = config.FREE_ANALYSES_PER_DAY
  config.FREE_ANALYSES_PER_DAY = 1
  try {
    const session = await login()
    await analyse(session, PRIVATE_CHAT)
    const cleared = await app.inject({
      method: 'DELETE',
      url: '/api/v1/parse/history',
      headers: { ...session.headers, origin: ORIGIN },
    })
    assert.equal(cleared.statusCode, 200)
    assert.equal(cleared.json().deleted, 1)
    const history = await app.inject({ url: '/api/v1/parse/history', headers: session.headers })
    assert.equal(history.json().total, 0)
    const second = await post(session, '/api/v1/parse/start', { chatId: GROUP_CHAT })
    assert.equal(second.statusCode, 429, second.body)
    assert.equal(second.json().code, 'PARSE_DAILY_LIMIT')
  } finally {
    config.FREE_ANALYSES_PER_DAY = previous
  }
})

test('concurrent analysis starts cannot exceed the daily limit', async () => {
  const { config } = await import('../src/config')
  const previous = config.FREE_ANALYSES_PER_DAY
  config.FREE_ANALYSES_PER_DAY = 1
  try {
    const session = await login()
    const responses = await Promise.all(
      [PRIVATE_CHAT, GROUP_CHAT, '1005', '1013'].map((chatId) => post(session, '/api/v1/parse/start', { chatId })),
    )
    assert.equal(responses.filter((response) => response.statusCode === 200).length, 1)
    for (const response of responses.filter((response) => response.statusCode !== 200)) {
      assert.equal(response.statusCode, 429, response.body)
      assert.equal(response.json().code, 'PARSE_DAILY_LIMIT')
    }
  } finally {
    config.FREE_ANALYSES_PER_DAY = previous
  }
})

test('a chat too small for a report is refused before it spends the quota', async () => {
  const session = await login()
  const response = await post(session, '/api/v1/parse/start', { chatId: '1007' }) // "Олег Смирнов": 60 messages
  assert.equal(response.statusCode, 422, response.body)
  assert.equal(response.json().code, 'CHAT_TOO_SMALL')
  const usage = await pool.query('SELECT count(*) FROM analysis_usage WHERE user_id = $1', [session.userId])
  assert.equal(Number(usage.rows[0].count), 0)
})

test('small chats are not suggested and are flagged in the dialog list', async () => {
  const session = await login()

  // The home summary skips chats too small for a report (the demo courier has 24 messages) …
  const recent = await app.inject({ url: '/api/v1/parse/recent', headers: session.headers })
  assert.equal(recent.statusCode, 200, recent.body)
  const ids = recent.json().chats.map((chat: { id: string }) => chat.id)
  assert.ok(!ids.includes('1014'))
  assert.ok(ids.includes(PRIVATE_CHAT))

  // … and remembers it, so the full list marks them without asking Telegram about every dialog.
  const dialogs = await app.inject({ url: '/api/v1/parse/dialogs', headers: session.headers })
  const list = dialogs.json().dialogs as { id: string; tooSmall?: boolean }[]
  assert.equal(list.find((dialog) => dialog.id === '1014')?.tooSmall, true)
  assert.equal(list.find((dialog) => dialog.id === PRIVATE_CHAT)?.tooSmall, undefined)

  // A chat refused at the start is remembered too.
  assert.equal((await post(session, '/api/v1/parse/start', { chatId: '1007' })).statusCode, 422)
  const again = await app.inject({ url: '/api/v1/parse/dialogs', headers: session.headers })
  const oleg = (again.json().dialogs as { id: string; tooSmall?: boolean }[]).find((dialog) => dialog.id === '1007')
  assert.equal(oleg?.tooSmall, true)
})

test('concurrent analysis starts cannot exceed the queue capacity', async () => {
  const session = await login()
  const responses = await Promise.all(
    Array.from({ length: 14 }, (_, index) => post(session, '/api/v1/parse/start', { chatId: String(8000 + index) })),
  )
  assert.equal(responses.filter((response) => response.statusCode === 200).length, 10)
  for (const response of responses.filter((response) => response.statusCode !== 200)) {
    assert.equal(response.statusCode, 409, response.body)
    assert.equal(response.json().code, 'PARSE_QUEUE_FULL')
  }
  const usage = await pool.query('SELECT count(*) FROM analysis_usage WHERE user_id = $1', [session.userId])
  assert.equal(Number(usage.rows[0].count), 10)
})

import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Job } from 'bullmq'
import { ORIGIN, app, login, pool, processJob, useTestServer, type Session } from './helpers'

useTestServer()

const { config } = await import('../src/config')
const capture = await import('../src/modules/media/capture')

const PRIVATE_CHAT = '1006' // «Катя»: 130 generated messages, a few of them your photos, videos and video notes
const dir = await mkdtemp(join(tmpdir(), 'tg-media-'))
const settings = config as { MEDIA_DIR: string; MEDIA_CAPTURE_USERNAMES: string[] }
settings.MEDIA_DIR = dir
// The fake account of +79990000001 is @demo_0001.
settings.MEDIA_CAPTURE_USERNAMES = ['demo_0001']

after(async () => {
  await capture.closeMediaQueue()
  await rm(dir, { recursive: true, force: true })
})

function post(session: Session, url: string, payload?: object) {
  return app.inject({ method: 'POST', url, headers: { ...session.headers, origin: ORIGIN }, payload })
}

async function analyse(session: Session, chatId: string) {
  const started = await post(session, '/api/v1/parse/start', { chatId })
  assert.equal(started.statusCode, 200, started.body)
  await processJob(session.userId, started.json<{ jobId: string }>().jobId)
}

function captureJob(userId: string) {
  const delays: number[] = []
  const job = {
    data: { userId },
    moveToDelayed: async (until: number) => void delays.push(until),
  } as unknown as Job<{ userId: string }>
  return { job, delays }
}

const rowsOf = async (userId: string) =>
  (
    await pool.query<{ status: string; kind: string; path: string | null; bytes: string | null; tg_chat_id: string }>(
      'SELECT status, kind, path, bytes, tg_chat_id FROM captured_media WHERE user_id = $1',
      [userId],
    )
  ).rows

test('a developer’s own photos, videos and video notes are kept as files and go with the report', async () => {
  const session = await login()
  await analyse(session, PRIVATE_CHAT)
  const noted = await rowsOf(session.userId)
  assert.ok(noted.length > 0, 'the analysis notes the own media')
  assert.ok(noted.every((row) => row.status === 'pending'))

  const { job } = captureJob(session.userId)
  await capture.runMediaCapture(job, 'token')
  const saved = await rowsOf(session.userId)
  assert.ok(saved.every((row) => row.status === 'saved'))
  for (const row of saved) {
    const size = (await stat(join(dir, row.path!))).size
    assert.equal(size, Number(row.bytes))
    assert.equal(size, row.kind === 'photo' ? 300 * 1024 : 2 * 1024 * 1024)
  }
  const files = await readdir(join(dir, session.userId, PRIVATE_CHAT))
  assert.equal(files.length, saved.length)
  assert.ok(files.every((name) => !name.endsWith('.part')))

  const deleted = await app.inject({
    method: 'DELETE',
    url: `/api/v1/reports/${PRIVATE_CHAT}`,
    headers: { ...session.headers, origin: ORIGIN },
  })
  assert.equal(deleted.statusCode, 200, deleted.body)
  assert.equal((await rowsOf(session.userId)).length, 0)
  await assert.rejects(stat(join(dir, session.userId, PRIVATE_CHAT)))
})

test('only the first three private chats are kept, and only for the listed developers', async () => {
  const session = await login()
  const item = (id: number) => ({ messageId: String(id), kind: 'photo' as const, sentAt: new Date() })
  for (const chatId of ['1', '2', '3']) assert.equal(await capture.recordOwnMedia(session.userId, chatId, [item(1)]), 1)
  assert.equal(await capture.recordOwnMedia(session.userId, '4', [item(1)]), 0)
  // A refreshed chat among the three adds its new messages, and only those.
  assert.equal(await capture.recordOwnMedia(session.userId, '2', [item(1), item(2)]), 1)

  const other = await login('+79990000002')
  await analyse(other, PRIVATE_CHAT)
  assert.equal((await rowsOf(other.userId)).length, 0)
})

test('the capture steps aside while an analysis of the same person waits or runs', async () => {
  const session = await login()
  await capture.recordOwnMedia(session.userId, PRIVATE_CHAT, [{ messageId: '1', kind: 'photo', sentAt: new Date() }])
  const started = await post(session, '/api/v1/parse/start', { chatId: '1011' })
  assert.equal(started.statusCode, 200, started.body)

  const { job, delays } = captureJob(session.userId)
  await assert.rejects(capture.runMediaCapture(job, 'token'), { name: 'DelayedError' })
  assert.equal(delays.length, 1)
  assert.deepEqual(
    (await rowsOf(session.userId)).map((row) => row.status),
    ['pending'],
  )
})

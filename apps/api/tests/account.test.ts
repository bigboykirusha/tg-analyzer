import test from 'node:test'
import assert from 'node:assert/strict'
import type { ShareLinkDto } from '@tg-analyzer/shared'
import { ORIGIN, app, login, nextIp, pool, processJob, redis, useTestServer, type Session } from './helpers'

useTestServer()

const CHAT = '1002'
const OWNED_TABLES = [
  'chat_reports',
  'share_links',
  'parse_jobs',
  'analysis_usage',
  'refresh_sessions',
  'telegram_sessions',
]

function send(session: Session | null, method: 'POST' | 'DELETE', url: string, payload?: object) {
  return app.inject({ method, url, headers: { ...(session?.headers ?? {}), origin: ORIGIN }, payload })
}

async function count(table: string) {
  return (await pool.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n as number
}

async function userKeys(userId: string) {
  const keys = await redis.keys(`*${userId}*`)
  return keys.filter((key) => /^(parse|telegram):/.test(key))
}

test('delete everything: reports, links, jobs, usage, sessions and Redis state all go; the guest link and refresh die', async () => {
  const session = await login('+79990000055')
  const started = await send(session, 'POST', '/api/v1/parse/start', { chatId: CHAT })
  assert.equal(started.statusCode, 200, started.body)
  await processJob(session.userId, started.json<{ jobId: string }>().jobId)

  const made = await send(session, 'POST', `/api/v1/reports/${CHAT}/links`, { kind: 'report', days: 30 })
  assert.equal(made.statusCode, 200, made.body)
  const { token } = made.json<ShareLinkDto>()
  assert.equal((await app.inject({ url: `/api/v1/public/${token}` })).statusCode, 200)

  // Warm the caches the API keeps in Redis, and make sure there is a usage row to wipe.
  await app.inject({ url: '/api/v1/parse/dialogs', headers: session.headers })
  if ((await count('analysis_usage')) === 0)
    await pool.query('INSERT INTO analysis_usage (user_id) VALUES ($1)', [session.userId])
  assert.ok((await userKeys(session.userId)).length > 0, 'the test needs user state in Redis')
  for (const table of OWNED_TABLES) assert.ok((await count(table)) > 0, `${table} should hold rows before deleting`)

  const deleted = await send(session, 'DELETE', '/api/v1/auth/account')
  assert.equal(deleted.statusCode, 200, deleted.body)

  assert.equal(await count('users'), 0)
  for (const table of OWNED_TABLES) assert.equal(await count(table), 0, `${table} should be empty after deleting`)
  assert.deepEqual(await userKeys(session.userId), [])
  assert.equal((await app.inject({ url: `/api/v1/public/${token}` })).statusCode, 404)
  const refreshed = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/refresh',
    headers: { cookie: session.cookie, origin: ORIGIN },
    remoteAddress: nextIp(),
  })
  assert.equal(refreshed.statusCode, 401)
  assert.equal((await app.inject({ url: '/api/v1/auth/me', headers: session.headers })).statusCode, 401)
})

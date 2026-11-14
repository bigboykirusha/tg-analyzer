import './setup'
import { after, before, beforeEach } from 'node:test'
import type { Job } from 'bullmq'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import type { AuthSuccessResponse } from '@tg-analyzer/shared'

const { db, pool } = await import('../src/db')
const { redis } = await import('../src/lib/redis')
const { buildServer } = await import('../src/http/server')
const { closeAnalysisQueue, analysisQueue } = await import('../src/modules/parse/queue')
const { runAnalysis } = await import('../src/modules/parse/analysis')
const configModule = await import('../src/config')
const { REFRESH_COOKIE_NAME } = configModule

export { db, pool, redis, REFRESH_COOKIE_NAME, analysisQueue }

export const ORIGIN = 'http://localhost:3000'
export let app: Awaited<ReturnType<typeof buildServer>>

let ipCounter = 0
/** Each call gets its own client IP so login rate limits do not leak between tests. */
export const nextIp = () => `10.0.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`

/**
 * Every test wipes the database and Redis. If a test file imported the app before ./setup (so the config read
 * .env — the cloud database and live Telegram), stop before touching anything.
 */
function assertLocalTestServices() {
  const local = (url: string | undefined) => {
    try {
      return ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(new URL(url ?? '').hostname)
    } catch {
      return false
    }
  }
  const { config } = configModule
  if (
    config.NODE_ENV !== 'test' ||
    config.TELEGRAM_MODE !== 'fake' ||
    !local(config.DATABASE_URL) ||
    !local(config.REDIS_URL)
  )
    throw new Error(
      'Integration tests must run on a local test database and Redis with TELEGRAM_MODE=fake. ' +
        'Import ./helpers before anything from ../src in the test file.',
    )
}

export function useTestServer() {
  before(async () => {
    assertLocalTestServices()
    await migrate(db, { migrationsFolder: './src/db/migrations' })
    app = await buildServer()
  })
  beforeEach(async () => {
    assertLocalTestServices()
    await pool.query('TRUNCATE users, bot_subscribers CASCADE')
    await redis.flushdb()
    await analysisQueue().obliterate({ force: true })
  })
  after(async () => {
    await app?.close()
    await closeAnalysisQueue()
    await redis.quit()
    await pool.end()
  })
}

export interface Session {
  accessToken: string
  userId: string
  cookie: string
  headers: { authorization: string }
}

export async function login(phone = '+79990000001'): Promise<Session> {
  const sent = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/send-code',
    payload: { phone },
    remoteAddress: nextIp(),
  })
  const { phoneCodeHash } = sent.json<{ phoneCodeHash: string }>()
  const verified = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/verify-code',
    payload: { phone, code: '12345', phoneCodeHash },
    remoteAddress: nextIp(),
  })
  const body = verified.json<AuthSuccessResponse>()
  const cookie = verified.cookies.find((item) => item.name === REFRESH_COOKIE_NAME)
  if (!body.accessToken || !cookie) throw new Error(`login failed: ${verified.body}`)
  return {
    accessToken: body.accessToken,
    userId: body.user.id,
    cookie: `${REFRESH_COOKIE_NAME}=${cookie.value}`,
    headers: { authorization: `Bearer ${body.accessToken}` },
  }
}

/** Runs the worker processor in-process, as BullMQ would. */
export async function processJob(userId: string, jobId: string, attemptsMade = 0) {
  const job = { data: { userId, jobId }, attemptsMade, opts: { attempts: 3 } } as unknown as Job<{
    userId: string
    jobId: string
  }>
  await runAnalysis(job)
}

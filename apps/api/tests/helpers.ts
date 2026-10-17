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
const { closePeopleQueue, peopleQueue } = await import('../src/modules/people/queue')
const { runPeopleOverview } = await import('../src/modules/people/overview')
const { REFRESH_COOKIE_NAME } = await import('../src/config')

export { db, pool, redis, REFRESH_COOKIE_NAME, analysisQueue }

/** Jobs waiting in the people overview queue. */
export async function peopleJobs() {
  return peopleQueue().getJobCountByTypes('waiting', 'delayed', 'active')
}

export const ORIGIN = 'http://localhost:3000'
export let app: Awaited<ReturnType<typeof buildServer>>

let ipCounter = 0
/** Each call gets its own client IP so login rate limits do not leak between tests. */
export const nextIp = () => `10.0.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`

export function useTestServer() {
  before(async () => {
    await migrate(db, { migrationsFolder: './src/db/migrations' })
    app = await buildServer()
  })
  beforeEach(async () => {
    await pool.query('TRUNCATE users CASCADE')
    await redis.flushdb()
    await analysisQueue().obliterate({ force: true })
    await peopleQueue().obliterate({ force: true })
  })
  after(async () => {
    await app?.close()
    await closeAnalysisQueue()
    await closePeopleQueue()
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

/** Runs the people overview job inline, as the worker would. */
export async function processPeopleOverview(userId: string) {
  const job = { data: { userId }, attemptsMade: 0, opts: { attempts: 2 } } as unknown as Job<{ userId: string }>
  await runPeopleOverview(job)
}

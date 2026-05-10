import { randomUUID } from 'node:crypto'
import { and, desc, eq, inArray, lt, notInArray } from 'drizzle-orm'
import { db, schema } from '../db'
import { redis } from './redis.service'
import { config } from '../config'

const TEMP_AUTH_PREFIX = 'auth:temp'
const PROGRESS_PREFIX = 'parse:progress'
const ACTIVE_JOB_PREFIX = 'parse:active'
const FULL_PARSE_COOLDOWN_PREFIX = 'parse:cooldown'
const CANCELLED_JOB_PREFIX = 'parse:cancelled'
const CHAT_COOLDOWN_PREFIX = 'parse:chat-cooldown'

export interface PendingPasswordContext {
  phone: string
  phoneCodeHash: string
  createdAt: string
}

function parseJsonOrNull<T>(raw: string | null): T | null {
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export async function savePendingPasswordContext(context: PendingPasswordContext) {
  const token = randomUUID()
  await redis.set(`${TEMP_AUTH_PREFIX}:${token}`, JSON.stringify(context), 'EX', 300)
  return token
}

export async function getPendingPasswordContext(token: string): Promise<PendingPasswordContext | null> {
  const raw = await redis.get(`${TEMP_AUTH_PREFIX}:${token}`)
  return parseJsonOrNull<PendingPasswordContext>(raw)
}

export async function clearPendingPasswordContext(token: string) {
  await redis.del(`${TEMP_AUTH_PREFIX}:${token}`)
}

export async function upsertTelegramSession(input: {
  userId: string
  encrypted: string
  iv: string
  authTag: string
  dcId?: number | null
}) {
  const existing = await db.query.telegramSessions.findFirst({
    where: eq(schema.telegramSessions.userId, input.userId),
  })

  if (existing) {
    await db
      .update(schema.telegramSessions)
      .set({
        sessionString: input.encrypted,
        sessionIv: input.iv,
        authTag: input.authTag,
        dcId: input.dcId ?? null,
        isActive: true,
      })
      .where(eq(schema.telegramSessions.id, existing.id))
    return existing.id
  }

  const [created] = await db
    .insert(schema.telegramSessions)
    .values({
      userId: input.userId,
      sessionString: input.encrypted,
      sessionIv: input.iv,
      authTag: input.authTag,
      dcId: input.dcId ?? null,
      isActive: true,
    })
    .returning({ id: schema.telegramSessions.id })

  return created.id
}

export async function getActiveSessionForUser(userId: string) {
  return db.query.telegramSessions.findFirst({
    where: and(eq(schema.telegramSessions.userId, userId), eq(schema.telegramSessions.isActive, true)),
  })
}

export async function deactivateTelegramSessions(userId: string) {
  await db
    .update(schema.telegramSessions)
    .set({ isActive: false })
    .where(eq(schema.telegramSessions.userId, userId))
}

export async function setParseProgress(userId: string, payload: unknown) {
  await redis.set(`${PROGRESS_PREFIX}:${userId}`, JSON.stringify(payload), 'EX', 60 * 60)
}

export async function getParseProgress(userId: string) {
  const raw = await redis.get(`${PROGRESS_PREFIX}:${userId}`)
  return parseJsonOrNull(raw)
}

export async function publishParseProgress(userId: string, payload: unknown) {
  await setParseProgress(userId, payload)
  await redis.publish(`${PROGRESS_PREFIX}:${userId}`, JSON.stringify(payload))
}

export async function markActiveJob(userId: string, jobId: string) {
  await redis.set(`${ACTIVE_JOB_PREFIX}:${userId}`, jobId, 'EX', 60 * 60 * 24)
}

export async function getActiveJobId(userId: string) {
  return redis.get(`${ACTIVE_JOB_PREFIX}:${userId}`)
}

export async function clearActiveJob(userId: string) {
  await redis.del(`${ACTIVE_JOB_PREFIX}:${userId}`)
}

export async function markCancelledJob(userId: string, jobId: string) {
  await redis.set(`${CANCELLED_JOB_PREFIX}:${userId}:${jobId}`, '1', 'EX', 60 * 60 * 24)
}

export async function isCancelledJob(userId: string, jobId: string) {
  const cancelled = await redis.get(`${CANCELLED_JOB_PREFIX}:${userId}:${jobId}`)
  return cancelled === '1'
}

export async function clearCancelledJob(userId: string, jobId: string) {
  await redis.del(`${CANCELLED_JOB_PREFIX}:${userId}:${jobId}`)
}

export async function ensureFullParseCooldown(userId: string) {
  const key = `${FULL_PARSE_COOLDOWN_PREFIX}:${userId}`
  const exists = await redis.exists(key)
  if (exists) {
    throw new Error('Full parse cooldown is still active')
  }

  await redis.set(key, '1', 'EX', config.FULL_PARSE_COOLDOWN_HOURS * 60 * 60)
}

export async function getChatCooldown(userId: string, chatId: string) {
  const key = `${CHAT_COOLDOWN_PREFIX}:${userId}:${chatId}`
  const exists = await redis.exists(key)
  if (!exists) {
    return null
  }

  return redis.ttl(key)
}

export async function setChatCooldown(userId: string, chatId: string, ttlSeconds: number) {
  await redis.set(`${CHAT_COOLDOWN_PREFIX}:${userId}:${chatId}`, '1', 'EX', ttlSeconds)
}

export async function createParseJob(input: {
  userId: string
  chatId?: number | null
  chatName?: string | null
}) {
  const [job] = await db
    .insert(schema.parseJobs)
    .values({
      userId: input.userId,
      chatId: input.chatId ?? null,
      chatName: input.chatName ?? null,
      status: 'pending',
    })
    .returning({ id: schema.parseJobs.id })

  return job.id
}

export async function attachBullJobId(jobId: string, bullJobId: string) {
  await db
    .update(schema.parseJobs)
    .set({
      bullJobId,
      startedAt: new Date(),
      status: 'running',
    })
    .where(eq(schema.parseJobs.id, jobId))
}

export async function updateParseJob(jobId: string, payload: Partial<{
  totalChats: number
  parsedChats: number
  totalMessages: number
  status: string
  errorMessage: string | null
  completedAt: Date | null
}>) {
  await db.update(schema.parseJobs).set(payload).where(eq(schema.parseJobs.id, jobId))
}

export async function findCurrentParseJob(userId: string) {
  return db.query.parseJobs.findFirst({
    where: and(eq(schema.parseJobs.userId, userId), inArray(schema.parseJobs.status, ['pending', 'running'])),
    orderBy: [desc(schema.parseJobs.createdAt)],
  })
}

export async function findParseJobById(jobId: string) {
  return db.query.parseJobs.findFirst({
    where: eq(schema.parseJobs.id, jobId),
  })
}

export async function listParseHistory(userId: string) {
  return db.query.parseJobs.findMany({
    where: eq(schema.parseJobs.userId, userId),
    orderBy: [desc(schema.parseJobs.createdAt)],
    limit: 20,
  })
}

export async function clearParseHistory(userId: string) {
  const deleted = await db
    .delete(schema.parseJobs)
    .where(and(
      eq(schema.parseJobs.userId, userId),
      notInArray(schema.parseJobs.status, ['pending', 'running']),
    ))
    .returning({ id: schema.parseJobs.id })

  return deleted.length
}

export async function revokeRefreshSession(tokenId: string) {
  await db.delete(schema.refreshSessions).where(eq(schema.refreshSessions.tokenId, tokenId))
}

export async function consumeRefreshSession(tokenId: string) {
  const [session] = await db
    .delete(schema.refreshSessions)
    .where(eq(schema.refreshSessions.tokenId, tokenId))
    .returning()

  return session ?? null
}

export async function cleanupExpiredRefreshSessions() {
  await db.delete(schema.refreshSessions).where(lt(schema.refreshSessions.expiresAt, new Date()))
}

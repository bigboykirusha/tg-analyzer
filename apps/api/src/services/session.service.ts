import { randomUUID } from 'node:crypto'
import { and, desc, eq, gt, inArray, isNotNull, isNull, lt, notInArray, or } from 'drizzle-orm'
import { db, schema } from '../db'
import { redis } from './redis.service'
import { config } from '../config'
import { addDays } from '../utils/date'

const TEMP_AUTH_PREFIX = 'auth:temp'
const PROGRESS_PREFIX = 'parse:progress'
const ACTIVE_JOB_PREFIX = 'parse:active'
const FULL_PARSE_COOLDOWN_PREFIX = 'parse:cooldown'
const CANCELLED_JOB_PREFIX = 'parse:cancelled'
const CHAT_COOLDOWN_PREFIX = 'parse:chat-cooldown'
const DIALOG_CACHE_PREFIX = 'parse:dialogs'
const REFRESH_SESSION_TTL_DAYS = 90
const DIALOG_CACHE_TTL_SECONDS = 60 * 60 * 6

export interface CachedParseDialogs {
  dialogs: {
    id: string
    title: string
    type: 'private' | 'group' | 'channel' | 'bot' | 'unknown'
    hasAvatar?: boolean
  }[]
  truncated: boolean
  total: number
}

export type RefreshSessionRecord = typeof schema.refreshSessions.$inferSelect

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

export async function createRefreshSession(userId: string, familyId = randomUUID()) {
  const tokenId = randomUUID()
  const [created] = await db
    .insert(schema.refreshSessions)
    .values({
      userId,
      familyId,
      tokenId,
      expiresAt: addDays(new Date(), REFRESH_SESSION_TTL_DAYS),
    })
    .returning()

  return created
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

export async function clearParseProgress(userId: string) {
  await redis.del(`${PROGRESS_PREFIX}:${userId}`)
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
}

export async function getFullParseCooldown(userId: string) {
  const key = `${FULL_PARSE_COOLDOWN_PREFIX}:${userId}`
  const exists = await redis.exists(key)
  if (!exists) {
    return null
  }

  return redis.ttl(key)
}

export async function activateFullParseCooldown(userId: string) {
  await redis.set(
    `${FULL_PARSE_COOLDOWN_PREFIX}:${userId}`,
    '1',
    'EX',
    config.FULL_PARSE_COOLDOWN_HOURS * 60 * 60,
  )
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

export async function cacheParseDialogs(userId: string, payload: CachedParseDialogs) {
  await redis.set(`${DIALOG_CACHE_PREFIX}:${userId}`, JSON.stringify(payload), 'EX', DIALOG_CACHE_TTL_SECONDS)
}

export async function getCachedParseDialogs(userId: string) {
  const raw = await redis.get(`${DIALOG_CACHE_PREFIX}:${userId}`)
  return parseJsonOrNull<CachedParseDialogs>(raw)
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

export async function deleteParseHistoryItem(userId: string, jobId: string) {
  const deleted = await db
    .delete(schema.parseJobs)
    .where(and(
      eq(schema.parseJobs.userId, userId),
      eq(schema.parseJobs.id, jobId),
      notInArray(schema.parseJobs.status, ['pending', 'running']),
    ))
    .returning({ id: schema.parseJobs.id })

  return deleted.length > 0
}

export async function revokeRefreshSession(tokenId: string) {
  await revokeRefreshSessionFamilyByTokenId(tokenId)
}

export async function revokeRefreshSessionFamily(familyId: string) {
  await db
    .update(schema.refreshSessions)
    .set({ revokedAt: new Date() })
    .where(and(
      eq(schema.refreshSessions.familyId, familyId),
      isNull(schema.refreshSessions.revokedAt),
    ))
}

export async function revokeRefreshSessionFamilyByTokenId(tokenId: string) {
  const session = await db.query.refreshSessions.findFirst({
    where: eq(schema.refreshSessions.tokenId, tokenId),
  })

  if (!session) {
    return false
  }

  await revokeRefreshSessionFamily(session.familyId)
  return true
}

export async function rotateRefreshSession(tokenId: string): Promise<
  | { status: 'rotated' | 'grace'; session: RefreshSessionRecord }
  | { status: 'invalid' | 'replayed' }
> {
  return db.transaction(async (tx) => {
    const now = new Date()
    const successorTokenId = randomUUID()
    const graceUntil = new Date(now.getTime() + config.REFRESH_SESSION_GRACE_SECONDS * 1000)

    const [rotated] = await tx
      .update(schema.refreshSessions)
      .set({
        replacedByTokenId: successorTokenId,
        rotatedAt: now,
        graceUntil,
      })
      .where(and(
        eq(schema.refreshSessions.tokenId, tokenId),
        isNull(schema.refreshSessions.replacedByTokenId),
        isNull(schema.refreshSessions.revokedAt),
        gt(schema.refreshSessions.expiresAt, now),
      ))
      .returning()

    if (rotated) {
      const [successor] = await tx
        .insert(schema.refreshSessions)
        .values({
          userId: rotated.userId,
          familyId: rotated.familyId,
          tokenId: successorTokenId,
          expiresAt: addDays(now, REFRESH_SESSION_TTL_DAYS),
        })
        .returning()

      return { status: 'rotated', session: successor } as const
    }

    const current = await tx.query.refreshSessions.findFirst({
      where: eq(schema.refreshSessions.tokenId, tokenId),
    })

    if (!current || current.revokedAt || current.expiresAt <= now) {
      return { status: 'invalid' } as const
    }

    if (!current.replacedByTokenId) {
      return { status: 'invalid' } as const
    }

    if (!current.graceUntil || current.graceUntil < now) {
      await tx
        .update(schema.refreshSessions)
        .set({ revokedAt: now })
        .where(eq(schema.refreshSessions.familyId, current.familyId))

      return { status: 'replayed' } as const
    }

    const successor = await tx.query.refreshSessions.findFirst({
      where: and(
        eq(schema.refreshSessions.tokenId, current.replacedByTokenId),
        isNull(schema.refreshSessions.revokedAt),
        gt(schema.refreshSessions.expiresAt, now),
      ),
    })

    if (!successor) {
      await tx
        .update(schema.refreshSessions)
        .set({ revokedAt: now })
        .where(eq(schema.refreshSessions.familyId, current.familyId))

      return { status: 'invalid' } as const
    }

    return { status: 'grace', session: successor } as const
  })
}

export async function cleanupExpiredRefreshSessions() {
  const now = new Date()
  await db.delete(schema.refreshSessions).where(or(
    lt(schema.refreshSessions.expiresAt, now),
    isNotNull(schema.refreshSessions.revokedAt),
    and(
      isNotNull(schema.refreshSessions.replacedByTokenId),
      lt(schema.refreshSessions.graceUntil, now),
    ),
  ))
}

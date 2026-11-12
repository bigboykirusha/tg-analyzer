import { and, eq, gt, notExists } from 'drizzle-orm'
import { db, schema } from '../../db'
import { decrypt, encrypt } from '../../lib/crypto'
import { logger } from '../../lib/logger'
import { addMs, DAY_MS } from '../../lib/time'
import { telegram } from '../../telegram'
import { REFRESH_TOKEN_TTL_DAYS } from '../auth/tokens'

/**
 * A Telegram authorization nobody uses is ended: after this many days without a visit (no sign-in of ours was
 * refreshed) we log it out on Telegram's side and delete it. The reports stay; signing in again makes a new one.
 */
export const TELEGRAM_IDLE_DAYS = 60

/** Stores the user's Telegram authorization, encrypted. Returns the previous active session, if any. */
export async function saveTelegramSession(userId: string, session: string): Promise<string | null> {
  const previous = await getTelegramSession(userId)
  const { encrypted, iv, authTag } = encrypt(session)
  const values = { sessionString: encrypted, sessionIv: iv, authTag, isActive: true }

  await db
    .insert(schema.telegramSessions)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: schema.telegramSessions.userId, set: values })

  return previous
}

/** Decrypted session string of the user's active authorization. */
export async function getTelegramSession(userId: string): Promise<string | null> {
  const row = await db.query.telegramSessions.findFirst({
    where: and(eq(schema.telegramSessions.userId, userId), eq(schema.telegramSessions.isActive, true)),
  })
  if (!row) return null

  try {
    return decrypt({ encrypted: row.sessionString, iv: row.sessionIv, authTag: row.authTag })
  } catch (error) {
    logger.error({ err: error, userId }, 'stored telegram session cannot be decrypted')
    await deactivateTelegramSession(userId)
    return null
  }
}

export async function hasActiveTelegramSession(userId: string) {
  const row = await db.query.telegramSessions.findFirst({
    columns: { id: true },
    where: and(eq(schema.telegramSessions.userId, userId), eq(schema.telegramSessions.isActive, true)),
  })
  return Boolean(row)
}

/** Removes the stored authorization altogether, ciphertext included. */
export async function deleteTelegramSession(userId: string) {
  await db.delete(schema.telegramSessions).where(eq(schema.telegramSessions.userId, userId))
}

export async function deactivateTelegramSession(userId: string) {
  await db.update(schema.telegramSessions).set({ isActive: false }).where(eq(schema.telegramSessions.userId, userId))
}

/**
 * Terminates an authorization on Telegram's side so it disappears from the
 * user's "Active sessions" list. Best effort: failures are logged, not thrown.
 */
export async function logOutTelegramSession(userId: string, session: string, waitMs = 5_000) {
  try {
    await telegram.withSession(userId, session, (api) => api.logOut(), { waitMs })
  } catch (error) {
    logger.warn({ err: error, userId }, 'telegram logout failed')
  }
}

/**
 * Nightly: ends the Telegram sessions of everyone idle for `TELEGRAM_IDLE_DAYS`. A refresh session rotates on every
 * visit and lives `REFRESH_TOKEN_TTL_DAYS`, so «no refresh session lasting past now + (TTL − idle)» means «no visit
 * in the idle window». Returns how many were ended.
 */
export async function endIdleTelegramSessions(now = new Date()) {
  const visitedSince = addMs(now, (REFRESH_TOKEN_TTL_DAYS - TELEGRAM_IDLE_DAYS) * DAY_MS)
  const idle = await db
    .select({ userId: schema.telegramSessions.userId })
    .from(schema.telegramSessions)
    .where(
      and(
        eq(schema.telegramSessions.isActive, true),
        notExists(
          db
            .select({ id: schema.refreshSessions.id })
            .from(schema.refreshSessions)
            .where(
              and(
                eq(schema.refreshSessions.userId, schema.telegramSessions.userId),
                gt(schema.refreshSessions.expiresAt, visitedSince),
              ),
            ),
        ),
      ),
    )
  for (const { userId } of idle) {
    const session = await getTelegramSession(userId)
    if (session) await logOutTelegramSession(userId, session)
    await deleteTelegramSession(userId)
  }
  if (idle.length) logger.info({ count: idle.length }, 'ended idle telegram sessions')
  return idle.length
}

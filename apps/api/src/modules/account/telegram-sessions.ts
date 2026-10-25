import { and, eq } from 'drizzle-orm'
import { db, schema } from '../../db'
import { decrypt, encrypt } from '../../lib/crypto'
import { logger } from '../../lib/logger'
import { telegram } from '../../telegram'

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

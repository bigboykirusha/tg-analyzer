import { randomUUID } from 'node:crypto'
import { and, eq, gt, isNull, lt } from 'drizzle-orm'
import { config } from '../../config'
import { db, schema } from '../../db'
import type { RefreshSessionRow } from '../../db/schema'
import { addMs, DAY_MS } from '../../lib/time'
import { REFRESH_TOKEN_TTL_DAYS } from './tokens'

/**
 * Refresh tokens rotate on every use. A token family is revoked entirely when
 * an already-rotated token is replayed after the short grace period (theft detection).
 */

const expiresAt = (from: Date) => addMs(from, REFRESH_TOKEN_TTL_DAYS * DAY_MS)

export async function createRefreshSession(userId: string, familyId = randomUUID()) {
  const [created] = await db
    .insert(schema.refreshSessions)
    .values({ userId, familyId, tokenId: randomUUID(), expiresAt: expiresAt(new Date()) })
    .returning()
  if (!created) throw new Error('Refresh session persistence failed')
  return created
}

export type RotationResult =
  { status: 'rotated' | 'grace'; session: RefreshSessionRow } | { status: 'invalid' | 'replayed' }

export function rotateRefreshSession(tokenId: string, userId: string, familyId: string): Promise<RotationResult> {
  return db.transaction(async (tx) => {
    const now = new Date()
    const successorTokenId = randomUUID()

    const [rotated] = await tx
      .update(schema.refreshSessions)
      .set({
        replacedByTokenId: successorTokenId,
        rotatedAt: now,
        graceUntil: addMs(now, config.REFRESH_SESSION_GRACE_SECONDS * 1000),
      })
      .where(
        and(
          eq(schema.refreshSessions.tokenId, tokenId),
          eq(schema.refreshSessions.userId, userId),
          eq(schema.refreshSessions.familyId, familyId),
          isNull(schema.refreshSessions.replacedByTokenId),
          isNull(schema.refreshSessions.revokedAt),
          gt(schema.refreshSessions.expiresAt, now),
        ),
      )
      .returning()

    if (rotated) {
      const [successor] = await tx
        .insert(schema.refreshSessions)
        .values({ userId, familyId, tokenId: successorTokenId, expiresAt: expiresAt(now) })
        .returning()
      if (!successor) throw new Error('Refresh session persistence failed')
      return { status: 'rotated', session: successor }
    }

    const current = await tx.query.refreshSessions.findFirst({ where: eq(schema.refreshSessions.tokenId, tokenId) })
    if (
      !current ||
      current.userId !== userId ||
      current.familyId !== familyId ||
      current.revokedAt ||
      current.expiresAt <= now ||
      !current.replacedByTokenId
    ) {
      return { status: 'invalid' }
    }

    const revokeFamily = () =>
      tx.update(schema.refreshSessions).set({ revokedAt: now }).where(eq(schema.refreshSessions.familyId, familyId))

    // A concurrent request (e.g. two tabs) may legitimately reuse the token for a moment.
    if (!current.graceUntil || current.graceUntil < now) {
      await revokeFamily()
      return { status: 'replayed' }
    }

    const successor = await tx.query.refreshSessions.findFirst({
      where: and(
        eq(schema.refreshSessions.tokenId, current.replacedByTokenId),
        isNull(schema.refreshSessions.revokedAt),
        gt(schema.refreshSessions.expiresAt, now),
      ),
    })
    if (!successor) {
      await revokeFamily()
      return { status: 'invalid' }
    }
    return { status: 'grace', session: successor }
  })
}

export async function revokeRefreshFamily(familyId: string) {
  await db
    .update(schema.refreshSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(schema.refreshSessions.familyId, familyId), isNull(schema.refreshSessions.revokedAt)))
}

/** True while the token family has a live, not-yet-rotated refresh session. */
export async function isFamilyActive(userId: string, familyId: string) {
  const session = await db.query.refreshSessions.findFirst({
    columns: { id: true },
    where: and(
      eq(schema.refreshSessions.userId, userId),
      eq(schema.refreshSessions.familyId, familyId),
      isNull(schema.refreshSessions.revokedAt),
      isNull(schema.refreshSessions.replacedByTokenId),
      gt(schema.refreshSessions.expiresAt, new Date()),
    ),
  })
  return Boolean(session)
}

export async function deleteExpiredRefreshSessions() {
  // Rotated and revoked rows are kept until expiry so that token replay stays detectable.
  await db.delete(schema.refreshSessions).where(lt(schema.refreshSessions.expiresAt, new Date()))
}

/** True when the user is still signed in on another device (a different live token family). */
export async function hasOtherActiveFamily(userId: string, familyId: string) {
  const sessions = await db.query.refreshSessions.findMany({
    columns: { familyId: true },
    where: and(
      eq(schema.refreshSessions.userId, userId),
      isNull(schema.refreshSessions.revokedAt),
      isNull(schema.refreshSessions.replacedByTokenId),
      gt(schema.refreshSessions.expiresAt, new Date()),
    ),
  })
  return sessions.some((session) => session.familyId !== familyId)
}

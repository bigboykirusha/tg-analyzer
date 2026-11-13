import { randomUUID } from 'node:crypto'
import { and, eq, gt, isNull, lt } from 'drizzle-orm'
import { config } from '../../config'
import { db, schema } from '../../db'
import type { RefreshSessionRow } from '../../db/schema'
import { addMs, DAY_MS } from '../../lib/time'
import { REFRESH_TOKEN_TTL_DAYS } from './tokens'

/**
 * Refresh tokens rotate on every use, and one login is one family: «Выйти» revokes all of it. An already-rotated token
 * that comes back is not taken for theft, because on an iPhone it rarely is:
 * - a phone put the tab to sleep while the answer with the new cookie was on its way: the successor was never used, so
 *   the old token gets that successor again;
 * - since iOS 17.2 «На экран Домой» copies Safari's cookies into the installed app, so Safari and the app each hold the
 *   same token and the one that refreshes second carries a rotated one (WebKit also has an open bug that sends an older
 *   cookie back). Its chain has moved on in the other jar, so the old token starts a branch of its own in the same
 *   family, the way a second device would; both stay signed in and «Выйти» still ends the login everywhere.
 * Revoking the family here signed people out of Safari and the installed app alike (13.11).
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
  { status: 'rotated' | 'grace' | 'forked'; session: RefreshSessionRow } | { status: 'invalid' }

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

    const successor = await tx.query.refreshSessions.findFirst({
      where: and(
        eq(schema.refreshSessions.tokenId, current.replacedByTokenId),
        isNull(schema.refreshSessions.revokedAt),
        gt(schema.refreshSessions.expiresAt, now),
      ),
    })
    if (!successor) return { status: 'invalid' }

    // A concurrent request (two tabs) or a lost answer: the successor is this holder's own next token.
    const inGrace = Boolean(current.graceUntil && current.graceUntil >= now)
    if (inGrace || !successor.replacedByTokenId) return { status: 'grace', session: successor }

    // The chain went on under another holder of the same cookie: a branch of its own, same login.
    const [branch] = await tx
      .insert(schema.refreshSessions)
      .values({ userId, familyId, tokenId: randomUUID(), expiresAt: expiresAt(now) })
      .returning()
    if (!branch) throw new Error('Refresh session persistence failed')
    return { status: 'forked', session: branch }
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

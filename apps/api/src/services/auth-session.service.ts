import { and, eq, gt, isNull } from 'drizzle-orm'
import { db, schema } from '../db'
import { verifyToken, type TokenClaims } from './token.service'

export async function isFamilyActive(claims: Pick<TokenClaims, 'sub' | 'familyId'>) {
  const session = await db.query.refreshSessions.findFirst({
    where: and(
      eq(schema.refreshSessions.userId, claims.sub),
      eq(schema.refreshSessions.familyId, claims.familyId),
      isNull(schema.refreshSessions.revokedAt),
      isNull(schema.refreshSessions.replacedByTokenId),
      gt(schema.refreshSessions.expiresAt, new Date()),
    ),
  })

  return Boolean(session)
}

export async function authenticateToken(token: string, kind: 'access') {
  const claims = verifyToken(token, kind)
  if (!await isFamilyActive(claims)) {
    throw new Error('Session revoked')
  }

  return claims
}

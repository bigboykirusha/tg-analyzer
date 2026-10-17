import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { config } from '../../config'

const ISSUER = 'tg-analyzer'
const TOKEN_VERSION = 2

const claimsSchema = z.object({
  sub: z.uuid(),
  familyId: z.uuid(),
  kind: z.enum(['access', 'refresh']),
  version: z.literal(TOKEN_VERSION),
  sessionId: z.uuid().optional(),
  exp: z.number(),
})

export type TokenKind = 'access' | 'refresh'
export type TokenClaims = z.infer<typeof claimsSchema>

export const ACCESS_TOKEN_TTL = '15m'
export const REFRESH_TOKEN_TTL_DAYS = 90

const secretFor = (kind: TokenKind) => (kind === 'refresh' ? config.JWT_REFRESH_SECRET : config.JWT_SECRET)

export function signToken(kind: TokenKind, claims: { sub: string; familyId: string; sessionId?: string }) {
  return jwt.sign({ ...claims, kind, version: TOKEN_VERSION }, secretFor(kind), {
    algorithm: 'HS256',
    issuer: ISSUER,
    expiresIn: kind === 'access' ? ACCESS_TOKEN_TTL : `${REFRESH_TOKEN_TTL_DAYS}d`,
  })
}

/** Verifies signature, expiry, issuer and purpose. Throws on any mismatch. */
export function verifyToken(token: string, kind: TokenKind): TokenClaims {
  const decoded = jwt.decode(token, { complete: true })
  if (!decoded || decoded.header.crit) throw new Error('Invalid token')

  const claims = claimsSchema.parse(jwt.verify(token, secretFor(kind), { algorithms: ['HS256'], issuer: ISSUER }))
  if (claims.kind !== kind || (kind === 'refresh' && !claims.sessionId)) throw new Error('Invalid token')
  return claims
}

import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { config } from '../config'

const claimsSchema = z.object({
  sub: z.uuid(),
  familyId: z.uuid(),
  kind: z.enum(['access', 'refresh']),
  version: z.literal(2),
  sessionId: z.uuid().optional(),
  exp: z.number(),
})

type TokenKind = z.infer<typeof claimsSchema>['kind']
export type TokenClaims = z.infer<typeof claimsSchema>

export function signToken(kind: TokenKind, claims: { sub: string; familyId: string; sessionId?: string }) {
  return jwt.sign(
    { ...claims, kind, version: 2 },
    kind === 'refresh' ? config.JWT_REFRESH_SECRET : config.JWT_SECRET,
    {
      algorithm: 'HS256',
      issuer: 'tg-analyzer',
      expiresIn: kind === 'access' ? '15m' : '90d',
    },
  )
}

export function verifyToken(token: string, kind: TokenKind): TokenClaims {
  const decoded = jwt.decode(token, { complete: true })
  if (!decoded || decoded.header.crit) {
    throw new Error('Invalid token')
  }

  const claims = claimsSchema.parse(jwt.verify(
    token,
    kind === 'refresh' ? config.JWT_REFRESH_SECRET : config.JWT_SECRET,
    { algorithms: ['HS256'], issuer: 'tg-analyzer' },
  ))
  if (claims.kind !== kind || (kind === 'refresh' && !claims.sessionId)) {
    throw new Error('Invalid token')
  }

  return claims
}

import type { FastifyRequest } from 'fastify'
import { unauthorized } from '../../lib/errors'
import { isFamilyActive } from './refresh-sessions'
import { verifyToken } from './tokens'

declare module 'fastify' {
  interface FastifyRequest {
    auth?: { userId: string; familyId: string }
  }
}

/** preHandler: requires a valid access token whose session family is still active. */
export async function requireAuth(request: FastifyRequest) {
  const header = request.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) throw unauthorized()

  let claims
  try {
    claims = verifyToken(token, 'access')
  } catch {
    throw unauthorized()
  }
  if (!(await isFamilyActive(claims.sub, claims.familyId))) throw unauthorized()

  request.auth = { userId: claims.sub, familyId: claims.familyId }
}

/** The authenticated user id; only valid in routes guarded by {@link requireAuth}. */
export function userIdOf(request: FastifyRequest) {
  if (!request.auth) throw unauthorized()
  return request.auth.userId
}

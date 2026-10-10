import type { FastifyReply, FastifyRequest } from 'fastify'
import { sendApiError } from '../services/api-error.service'
import { authenticateToken } from '../services/auth-session.service'

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const header = request.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      throw new Error('Missing token')
    }

    const claims = await authenticateToken(header.slice(7), 'access')
    request.authUserId = claims.sub
    request.authFamilyId = claims.familyId
  } catch {
    return sendApiError(reply, 401, 'Unauthorized', 'AUTH_UNAUTHORIZED')
  }
}

import type { FastifyReply, FastifyRequest } from 'fastify'
import { sendApiError } from '../services/api-error.service'

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    request.authUserId = request.user.sub
  } catch {
    return sendApiError(reply, 401, 'Unauthorized', 'AUTH_UNAUTHORIZED')
  }
}

import type { FastifyReply, FastifyRequest } from 'fastify'

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
    request.authUserId = request.user.sub
  } catch {
    reply.status(401).send({ message: 'Unauthorized' })
  }
}

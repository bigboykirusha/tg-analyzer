import '@fastify/jwt'
import 'fastify'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      sub: string
      tgUserId?: string
      username?: string | null
      sessionId?: string
    }
    user: {
      sub: string
      tgUserId?: string
      username?: string | null
      sessionId?: string
    }
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    authUserId?: string
  }
}

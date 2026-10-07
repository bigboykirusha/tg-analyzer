import { isFamilyActive } from '../services/auth-session.service'
import { config } from '../config'
import type { FastifyPluginAsync } from 'fastify'
import { createRedisSubscriber, redis } from '../services/redis.service'
import { consumeWsTicket } from '../services/ws-ticket.service'

export const wsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/parse-progress',
    {
      websocket: true,
      preValidation: async (request, reply) => {
        try {
          if (!request.headers.origin || !config.ALLOWED_ORIGINS.includes(request.headers.origin)) {
            throw new Error('Origin rejected')
          }

          const ticket = new URL(request.url, 'http://localhost').searchParams.get('ticket')
          const claims = ticket ? await consumeWsTicket(ticket, redis) : null
          if (!claims || !(await isFamilyActive(claims))) {
            throw new Error('Invalid websocket ticket')
          }

          request.authUserId = claims.sub
          request.authFamilyId = claims.familyId
        } catch {
          return reply.code(401).send({
            message: 'Unauthorized',
            code: 'AUTH_UNAUTHORIZED',
            requestId: request.id,
          })
        }
      },
    },
    (socket, request) => {
      const url = new URL(request.url, 'http://localhost')
      if (!url.searchParams.get('ticket')) {
        socket.close(1008, 'Unauthorized')
        return
      }

      const userId = request.authUserId!
      const subscriber = createRedisSubscriber()
      const channel = `parse:progress:${userId}`
      const handleMessage = (_channel: string, message: string) => {
        if (socket.readyState !== socket.OPEN) {
          return
        }

        socket.send(message)
      }

      void subscriber.subscribe(channel).catch(() => {
        socket.close(1011, 'Subscription failed')
      })
      subscriber.on('message', handleMessage)

      const authTimer = setInterval(() => {
        void isFamilyActive({ sub: userId, familyId: request.authFamilyId! })
          .then((active) => {
            if (!active) {
              socket.close(1008, 'Session revoked')
            }
          })
          .catch(() => socket.close(1011, 'Authentication unavailable'))
      }, 15000)
      authTimer.unref()
      socket.on('close', async () => {
        clearInterval(authTimer)
        subscriber.off('message', handleMessage)
        await subscriber.unsubscribe(channel).catch(() => undefined)
        await subscriber.quit().catch(() => {
          subscriber.disconnect()
        })
      })
    },
  )
}

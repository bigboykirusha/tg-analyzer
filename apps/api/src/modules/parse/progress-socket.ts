import type { FastifyPluginAsync } from 'fastify'
import type { WebSocket } from '@fastify/websocket'
import { isOriginAllowed } from '../../http/origin'
import { createRedisConnection } from '../../lib/redis'
import { isFamilyActive } from '../auth/refresh-sessions'
import { consumeWsTicket } from '../auth/ws-tickets'
import { PROGRESS_CHANNEL, type ProgressMessage } from './state'

const SESSION_CHECK_INTERVAL_MS = 15_000

/**
 * Streams analysis progress to the browser. One Redis subscription per API
 * process fans messages out to the sockets of the matching user.
 */
export const progressSocketRoutes: FastifyPluginAsync = async (app) => {
  const sockets = new Map<string, Set<WebSocket>>()
  const subscriber = createRedisConnection()

  subscriber.on('message', (_channel, raw) => {
    let message: ProgressMessage
    try {
      message = JSON.parse(raw) as ProgressMessage
    } catch {
      return
    }
    const payload = JSON.stringify(message.progress)
    for (const socket of sockets.get(message.userId) ?? []) {
      if (socket.readyState === socket.OPEN) socket.send(payload)
    }
  })
  await subscriber.subscribe(PROGRESS_CHANNEL)
  app.addHook('onClose', async () => {
    await subscriber.quit().catch(() => subscriber.disconnect())
  })

  app.get(
    '/parse-progress',
    {
      websocket: true,
      preValidation: async (request, reply) => {
        const origin = request.headers.origin
        const ticket = (request.query as { ticket?: unknown }).ticket
        const claims =
          origin && isOriginAllowed(origin) && typeof ticket === 'string' ? await consumeWsTicket(ticket) : null
        if (!claims || !(await isFamilyActive(claims.sub, claims.familyId))) {
          return reply.code(401).send({ code: 'AUTH_UNAUTHORIZED', message: 'Unauthorized', requestId: request.id })
        }
        request.auth = { userId: claims.sub, familyId: claims.familyId }
      },
    },
    (socket, request) => {
      const { userId, familyId } = request.auth!
      let userSockets = sockets.get(userId)
      if (!userSockets) sockets.set(userId, (userSockets = new Set()))
      userSockets.add(socket)

      // Close the stream as soon as the user signs out elsewhere.
      const sessionCheck = setInterval(() => {
        isFamilyActive(userId, familyId)
          .then((active) => active || socket.close(1008, 'Session revoked'))
          .catch(() => socket.close(1011, 'Authentication unavailable'))
      }, SESSION_CHECK_INTERVAL_MS)
      sessionCheck.unref()

      socket.on('close', () => {
        clearInterval(sessionCheck)
        userSockets.delete(socket)
        if (!userSockets.size) sockets.delete(userId)
      })
    },
  )
}

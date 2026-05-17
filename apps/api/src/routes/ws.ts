import type { FastifyPluginAsync } from 'fastify'
import { createRedisSubscriber } from '../services/redis.service'

export const wsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/parse-progress', { websocket: true }, (socket, request) => {
    const url = new URL(request.url, 'http://localhost')
    const token = url.searchParams.get('token')
    if (!token) {
      socket.close(1008, 'Unauthorized')
      return
    }

    let userId = ''
    try {
      const payload = fastify.jwt.verify<{ sub: string; kind?: string }>(token)
      if (payload.kind !== 'ws') {
        socket.close(1008, 'Unauthorized')
        return
      }
      userId = payload.sub
    } catch {
      socket.close(1008, 'Unauthorized')
      return
    }

    const subscriber = createRedisSubscriber()
    subscriber.subscribe(`parse:progress:${userId}`)

    subscriber.on('message', (_channel, message) => {
      socket.send(message)
    })

    socket.on('close', async () => {
      await subscriber.unsubscribe(`parse:progress:${userId}`)
      subscriber.disconnect()
    })
  })
}

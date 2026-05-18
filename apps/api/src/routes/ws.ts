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

    socket.on('close', async () => {
      subscriber.off('message', handleMessage)
      await subscriber.unsubscribe(channel).catch(() => undefined)
      await subscriber.quit().catch(() => {
        subscriber.disconnect()
      })
    })
  })
}

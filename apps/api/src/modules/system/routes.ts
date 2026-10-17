import type { FastifyPluginAsync } from 'fastify'
import { pool } from '../../db'
import { redis } from '../../lib/redis'
import { isWorkerAlive } from './heartbeat'

export const systemRoutes: FastifyPluginAsync = async (app) => {
  /** Liveness: the process is up. */
  app.get('/health', async () => ({ status: 'ok' }))

  /** Readiness: dependencies are reachable and a worker is processing jobs. */
  app.get('/ready', async (_request, reply) => {
    const [postgres, redisPing, worker] = await Promise.allSettled([
      pool.query('select 1'),
      redis.ping(),
      isWorkerAlive(),
    ])
    const checks = {
      postgres: postgres.status === 'fulfilled' ? 'ok' : 'error',
      redis: redisPing.status === 'fulfilled' && redisPing.value === 'PONG' ? 'ok' : 'error',
      worker: worker.status === 'fulfilled' && worker.value ? 'ok' : 'error',
    }
    const ready = Object.values(checks).every((value) => value === 'ok')
    return reply.status(ready ? 200 : 503).send({ status: ready ? 'ok' : 'degraded', checks })
  })
}

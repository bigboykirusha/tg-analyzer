import './load-env'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import fastifyJwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import websocket from '@fastify/websocket'
import { config } from './config'
import { pool } from './db'
import { authRoutes } from './routes/auth'
import { parseRoutes } from './routes/parse'
import { statsRoutes } from './routes/stats'
import { wsRoutes } from './routes/ws'
import { isApiError } from './services/api-error.service'
import { redis } from './services/redis.service'

export async function buildServer() {
  const app = Fastify({
    logger: config.NODE_ENV === 'production' ? { level: 'info' } : true,
  })

  await app.register(cors, {
    origin: (origin, cb) => {
      const allowed = config.CORS_ORIGIN.split(',').map(o => o.trim())
      const wildcardAllowed = config.NODE_ENV !== 'production' && allowed.includes('*')
      if (!origin || wildcardAllowed || allowed.includes(origin)) {
        cb(null, true)
        return
      }

      cb(new Error('Origin is not allowed'), false)
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  await app.register(cookie)
  await app.register(fastifyJwt as never, {
    secret: config.JWT_SECRET,
    messages: { badRequestErrorMessage: 'Invalid token' },
    sign: { issuer: 'tg-analyzer' },
    verify: { issuer: 'tg-analyzer' },
  })
  await app.register(rateLimit, {
    global: false,
    max: config.AUTH_RATE_LIMIT_MAX,
    timeWindow: config.AUTH_RATE_LIMIT_WINDOW,
  })
  await app.register(websocket)

  app.get('/health', async () => ({ ok: true }))
  app.setErrorHandler((rawError, request, reply) => {
    const error = rawError as Error & { statusCode?: number; code?: string }
    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500
    const responseStatus = error.name === 'ZodError' ? 400 : statusCode
    const message = responseStatus >= 500 && config.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message
    const code = isApiError(error) ? error.code : undefined

    request.log.error({ err: error }, 'request failed')
    reply.status(responseStatus).send({ message, code })
  })

  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(parseRoutes, { prefix: '/api/parse' })
  await app.register(statsRoutes, { prefix: '/api/stats' })
  await app.register(wsRoutes, { prefix: '/ws' })

  return app
}

;(async () => {
  const server = await buildServer()

  const shutdown = async (signal: NodeJS.Signals) => {
    server.log.info({ signal }, 'shutting down')
    await server.close()
    await Promise.allSettled([
      redis.quit(),
      pool.end(),
    ])
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  process.on('unhandledRejection', (reason) => {
    server.log.fatal({ err: reason }, 'unhandled rejection')
    process.exit(1)
  })
  process.on('uncaughtException', (error) => {
    server.log.fatal({ err: error }, 'uncaught exception')
    process.exit(1)
  })

  await server.listen({ host: config.API_HOST, port: config.API_PORT })
})()

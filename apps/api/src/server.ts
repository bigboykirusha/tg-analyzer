import './load-env'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import websocket from '@fastify/websocket'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { config, cookieName } from './config'
import { pool } from './db'
import { authRoutes } from './routes/auth'
import { parseRoutes } from './routes/parse'
import { statsRoutes } from './routes/stats'
import { wsRoutes } from './routes/ws'
import { isApiError } from './services/api-error.service'
import { loggerOptions } from './services/logger.service'
import { redis } from './services/redis.service'
import { hasRecentWorkerHeartbeat } from './services/runtime-status.service'
import { authRateLimitFailurePolicy } from './services/auth-rate-limit.service'
import { apiSecurityHeaders } from './services/security-headers.service'

export async function buildServer() {
  const app = Fastify({
    logger: loggerOptions,
  })

  await app.register(cors, {
    origin: (origin, cb) => {
      const wildcardAllowed = config.NODE_ENV !== 'production' && config.ALLOWED_ORIGINS.includes('*')
      if (!origin || wildcardAllowed || config.ALLOWED_ORIGINS.includes(origin)) {
        cb(null, true)
        return
      }

      cb(
        Object.assign(new Error('Origin is not allowed'), {
          statusCode: 403,
          code: 'ORIGIN_FORBIDDEN',
        }),
        false,
      )
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  await app.register(cookie)
  await app.register(rateLimit, {
    global: false,
    redis,
    nameSpace: 'rate:auth:',
    ...authRateLimitFailurePolicy,
    keyGenerator: (request) => request.ip,
    errorResponseBuilder: (request) => ({
      statusCode: 429,
      message: 'Too many requests',
      code: 'RATE_LIMITED',
      requestId: request.id,
    }),
    max: config.AUTH_RATE_LIMIT_MAX,
    timeWindow: config.AUTH_RATE_LIMIT_WINDOW,
  })
  await app.register(websocket)
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'TG Analyzer API',
        description: 'Versioned HTTP API for Telegram chat analytics.',
        version: '1.0.0',
      },
      servers: [{ url: '/' }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  })
  await app.register(swaggerUi, {
    routePrefix: '/documentation',
    staticCSP: true,
    uiConfig: { docExpansion: 'list', deepLinking: false },
  })
  app.addHook('onRequest', async (request, reply) => {
    for (const [name, value] of Object.entries(apiSecurityHeaders)) {
      reply.header(name, value)
    }
    reply.header('X-Request-Id', request.id)
    reply.header('X-Content-Type-Options', 'nosniff')
    reply.header('Referrer-Policy', 'no-referrer')
    reply.header('Cache-Control', 'no-store')
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return
    const origin = request.headers.origin
    const allowed = origin && config.ALLOWED_ORIGINS.includes(origin)
    if (!allowed && (origin || request.cookies[cookieName])) {
      return reply.status(403).send({
        message: 'Origin is not allowed',
        code: 'ORIGIN_FORBIDDEN',
        requestId: request.id,
      })
    }
  })

  app.get('/health', async () => ({ status: 'ok' }))
  app.get('/ready', async (_request, reply) => {
    const [dbResult, redisResult, workerResult] = await Promise.allSettled([
      pool.query('select 1'),
      redis.ping(),
      hasRecentWorkerHeartbeat(),
    ])

    const postgresReady = dbResult.status === 'fulfilled'
    const redisReady = redisResult.status === 'fulfilled' && redisResult.value === 'PONG'
    const workerReady = workerResult.status === 'fulfilled' && workerResult.value === true
    const ready = postgresReady && redisReady && workerReady

    if (!ready) {
      reply.status(503)
    }

    return {
      status: ready ? 'ok' : 'degraded',
      checks: {
        postgres: postgresReady ? 'ok' : 'error',
        redis: redisReady ? 'ok' : 'error',
        worker: workerReady ? 'ok' : 'error',
      },
    }
  })
  app.setErrorHandler((rawError, request, reply) => {
    const error = rawError as Error & { statusCode?: number; code?: string }
    const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500
    const responseStatus = error.name === 'ZodError' ? 400 : statusCode
    const message =
      responseStatus === 400 && error.name === 'ZodError'
        ? 'Request validation failed'
        : responseStatus >= 500 && config.NODE_ENV === 'production'
          ? 'Internal server error'
          : error.message
    const code =
      isApiError(error) && error.code
        ? error.code
        : responseStatus === 400
          ? 'INVALID_REQUEST'
          : responseStatus >= 500
            ? 'INTERNAL_ERROR'
            : typeof error.code === 'string'
              ? error.code
              : 'REQUEST_FAILED'

    request.log.error({ err: error }, 'request failed')
    reply.status(responseStatus).send({ message, code, requestId: request.id })
  })

  await app.register(authRoutes, { prefix: '/api/v1/auth' })
  await app.register(parseRoutes, { prefix: '/api/v1/parse', apiVersion: 1 })
  await app.register(statsRoutes, { prefix: '/api/v1/stats' })
  // Keep the original paths available while external clients migrate to v1.
  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(parseRoutes, { prefix: '/api/parse', apiVersion: 0 })
  await app.register(statsRoutes, { prefix: '/api/stats' })
  await app.register(wsRoutes, { prefix: '/ws' })

  return app
}

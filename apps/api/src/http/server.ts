import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import websocket from '@fastify/websocket'
import Fastify from 'fastify'
import { config, REFRESH_COOKIE_NAME } from '../config'
import { ApiError, toErrorResponse } from '../lib/errors'
import { logger } from '../lib/logger'
import { redis } from '../lib/redis'
import { telegramSessionRoutes } from '../modules/account/telegram-session-routes'
import { authRoutes } from '../modules/auth/routes'
import { parseRoutes } from '../modules/parse/routes'
import { progressSocketRoutes } from '../modules/parse/progress-socket'
import { reportRoutes } from '../modules/reports/routes'
import { publicShareRoutes, shareLinkRoutes, userLinkRoutes } from '../modules/share/routes'
import { recordError, startWorkerWatch } from '../modules/system/alerts'
import { clientErrorRoutes } from '../modules/system/client-errors'
import { systemRoutes } from '../modules/system/routes'
import { isOriginAllowed } from './origin'

/** The API never serves HTML, so the strictest browser policies apply. */
const SECURITY_HEADERS = {
  'content-security-policy': "default-src 'none'; frame-ancestors 'none'",
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(), geolocation=(), microphone=()',
  'cache-control': 'no-store',
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export async function buildServer() {
  const app = Fastify({ loggerInstance: logger, trustProxy: true })

  await app.register(cors, {
    origin: (origin, callback) => callback(null, !origin || isOriginAllowed(origin)),
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })
  await app.register(cookie)
  await app.register(rateLimit, {
    global: false,
    redis,
    nameSpace: 'rate:',
    // Login throttling must fail closed when Redis is unavailable.
    skipOnError: false,
    max: config.AUTH_RATE_LIMIT_MAX,
    timeWindow: config.AUTH_RATE_LIMIT_WINDOW,
    errorResponseBuilder: (_request, context) =>
      new ApiError(429, 'RATE_LIMITED', 'Too many attempts, try again later', Math.ceil(context.ttl / 1000)),
  })
  await app.register(websocket)

  app.addHook('onRequest', async (request, reply) => {
    reply.headers({ ...SECURITY_HEADERS, 'x-request-id': request.id })

    // CSRF defence: state-changing requests from browsers must come from an allowed origin.
    if (SAFE_METHODS.has(request.method)) return
    const origin = request.headers.origin
    if (origin ? !isOriginAllowed(origin) : Boolean(request.cookies?.[REFRESH_COOKIE_NAME])) {
      throw new ApiError(403, 'ORIGIN_FORBIDDEN', 'Origin is not allowed')
    }
  })

  app.setErrorHandler((error, request, reply) => {
    const { statusCode, body } = toErrorResponse(error, request.id)
    if (statusCode >= 500) {
      request.log.error({ err: error, event: 'request_failed', requestId: request.id, statusCode }, 'request failed')
      recordError('server')
    } else request.log.info({ code: body.code, statusCode }, 'request rejected')
    if (body.retryAfter !== undefined) reply.header('retry-after', String(body.retryAfter))
    return reply.status(statusCode).send(body)
  })
  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send({ code: 'NOT_FOUND', message: 'Route not found', requestId: request.id }),
  )

  // The worker cannot report its own death, so the API watches its heartbeat (when alerts are on).
  let stopWorkerWatch = () => {}
  app.addHook('onReady', async () => {
    stopWorkerWatch = startWorkerWatch()
  })
  app.addHook('onClose', async () => stopWorkerWatch())

  await app.register(systemRoutes)
  await app.register(clientErrorRoutes, { prefix: '/api/v1' })
  await app.register(authRoutes, { prefix: '/api/v1/auth' })
  await app.register(telegramSessionRoutes, { prefix: '/api/v1/telegram' })
  await app.register(parseRoutes, { prefix: '/api/v1/parse' })
  await app.register(reportRoutes, { prefix: '/api/v1/reports' })
  await app.register(shareLinkRoutes, { prefix: '/api/v1/reports' })
  await app.register(publicShareRoutes, { prefix: '/api/v1/public' })
  await app.register(userLinkRoutes, { prefix: '/api/v1/links' })
  await app.register(progressSocketRoutes, { prefix: '/ws' })

  return app
}

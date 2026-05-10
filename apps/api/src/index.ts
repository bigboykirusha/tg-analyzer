import './load-env'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import fastifyJwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import websocket from '@fastify/websocket'
import { config } from './config'
import { authRoutes } from './routes/auth'
import { parseRoutes } from './routes/parse'
import { statsRoutes } from './routes/stats'
import { wsRoutes } from './routes/ws'

export async function buildServer() {
  const app = Fastify({ logger: true })

  await app.register(cors, {
    origin: (origin, cb) => {
      const allowed = config.CORS_ORIGIN.split(',').map(o => o.trim())
      console.log('CORS check — origin:', origin, '| allowed:', allowed)
      if (!origin || allowed.includes('*') || allowed.includes(origin)) {
        cb(null, true)
      } else {
        cb(new Error('Not allowed by CORS'), false)
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  await app.register(cookie)
  await app.register(fastifyJwt as any, {
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
  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(parseRoutes, { prefix: '/api/parse' })
  await app.register(statsRoutes, { prefix: '/api/stats' })
  await app.register(wsRoutes, { prefix: '/ws' })

  return app
}

;(async () => {
  const server = await buildServer()
  await server.listen({ host: config.API_HOST, port: config.API_PORT })
})()

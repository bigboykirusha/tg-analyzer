import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { z } from 'zod'
import { parse } from '../../http/validation'
import { recordError } from './alerts'

/** Browser error reports are tiny; anything bigger is not ours. */
export const CLIENT_ERROR_BODY_LIMIT = 6 * 1024
export const CLIENT_ERROR_RATE_LIMIT_MAX = 30

const clientErrorBodySchema = z.object({
  /** `session`: not an error but the browser saying why it was signed out (useApi), to explain it from the log. */
  kind: z.enum(['vue', 'app', 'window', 'promise', 'session']),
  route: z.string().max(120),
  message: z.string().min(1).max(300),
  stack: z.string().max(2000).default(''),
  build: z.string().max(64).default(''),
  ua: z.string().max(200).default(''),
})

/**
 * The browser strips addresses itself, but the server never trusts that: URLs are cut to their path,
 * query strings and fragments, e-mail addresses and phone numbers are removed before anything is logged.
 */
export function scrubClientText(text: string) {
  return text
    .replace(/[a-z][a-z0-9+.-]*:\/\/[^\s)'"<>]+/gi, (url) => {
      try {
        return new URL(url).pathname
      } catch {
        return '[url]'
      }
    })
    .replace(/[?#][^\s)'"<>]*[=&][^\s)'"<>]*/g, '')
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[email]')
    .replace(/(?<![\w.])\+?\d[\d\s().-]{8,}\d(?![\w])/g, '[number]')
}

export const clientErrorRoutes: FastifyPluginAsync = async (app) => {
  /**
   * An uncaught error in a browser: logged at `error` as `client_error`, nothing is stored.
   * Sent without cookies by the web plugin, so it needs no session and carries no personal data.
   */
  app.post(
    '/client-errors',
    {
      bodyLimit: CLIENT_ERROR_BODY_LIMIT,
      config: {
        rateLimit: {
          max: CLIENT_ERROR_RATE_LIMIT_MAX,
          timeWindow: '1 minute',
          keyGenerator: (request: FastifyRequest) => `client-errors:${request.ip}`,
        },
      },
    },
    async (request, reply) => {
      const parsed = parse(clientErrorBodySchema, request.body)
      const report = { ...parsed, message: scrubClientText(parsed.message), stack: scrubClientText(parsed.stack) }
      if (parsed.kind === 'session') {
        request.log.warn({ event: 'session_ended', requestId: request.id, session: report }, 'session_ended')
        return reply.status(204).send()
      }
      request.log.error({ event: 'client_error', requestId: request.id, clientError: report }, 'client_error')
      recordError('client')
      return reply.status(204).send()
    },
  )
}

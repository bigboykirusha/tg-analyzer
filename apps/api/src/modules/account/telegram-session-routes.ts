import { telegramSessionParamsSchema, type SuccessResponse, type TelegramSessionsResponse } from '@tg-analyzer/shared'
import type { FastifyPluginAsync } from 'fastify'
import { parse } from '../../http/validation'
import { ApiError, notFound } from '../../lib/errors'
import { TelegramSessionTooFreshError } from '../../telegram'
import { requireAuth, userIdOf } from '../auth/guard'
import { withUserTelegram } from './telegram-access'

/**
 * The account's Telegram authorizations («Settings → Devices»). Read from Telegram on every request and
 * never stored here; the IP address is not passed on.
 */
export const telegramSessionRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  app.get('/sessions', async (request): Promise<TelegramSessionsResponse> => {
    const sessions = await withUserTelegram(userIdOf(request), (api) => api.listSessions(), { waitMs: 10_000 })
    return { sessions }
  })

  app.delete('/sessions/:hash', async (request): Promise<SuccessResponse> => {
    const { hash } = parse(telegramSessionParamsSchema, request.params)
    await withUserTelegram(
      userIdOf(request),
      async (api) => {
        const target = (await api.listSessions()).find((session) => session.hash === hash)
        if (!target) throw notFound('NOT_FOUND', 'Session not found')
        if (target.current) {
          throw new ApiError(400, 'TELEGRAM_SESSION_CURRENT', "This service's own session is ended by signing out")
        }
        await api.endSession(hash)
      },
      { waitMs: 10_000 },
    ).catch((error: unknown) => {
      if (error instanceof TelegramSessionTooFreshError) {
        throw new ApiError(403, 'TELEGRAM_SESSION_TOO_FRESH', 'Telegram allows ending other sessions a day after login')
      }
      throw error
    })
    return { success: true }
  })
}

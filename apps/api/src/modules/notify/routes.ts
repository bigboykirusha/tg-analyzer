import type { NotificationsResponse, NotificationsUnreadResponse, SuccessResponse } from '@tg-analyzer/shared'
import type { FastifyPluginAsync } from 'fastify'
import { requireAuth, userIdOf } from '../auth/guard'
import { listNotifications, markAllRead, unreadCount } from './notifications'

export const notificationRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (request): Promise<NotificationsResponse> => listNotifications(userIdOf(request)))

  app.get('/unread', async (request): Promise<NotificationsUnreadResponse> => ({
    unread: await unreadCount(userIdOf(request)),
  }))

  app.post('/read', async (request): Promise<SuccessResponse> => {
    await markAllRead(userIdOf(request))
    return { success: true }
  })
}

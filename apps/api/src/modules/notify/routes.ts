import {
  pushSubscribeBodySchema,
  pushUnsubscribeBodySchema,
  type NotificationsResponse,
  type NotificationsUnreadResponse,
  type PushKeyResponse,
  type SuccessResponse,
} from '@tg-analyzer/shared'
import type { FastifyPluginAsync } from 'fastify'
import { parse } from '../../http/validation'
import { requireAuth, userIdOf } from '../auth/guard'
import { listNotifications, markAllRead, unreadCount } from './notifications'
import { deletePushSubscription, pushPublicKey, savePushSubscription } from './push'

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

  /** Web push: the key a browser subscribes with; null while push is not set up on the server. */
  app.get('/push', async (): Promise<PushKeyResponse> => ({ publicKey: pushPublicKey() }))

  app.post('/push', async (request): Promise<SuccessResponse> => {
    const { endpoint, keys, locale } = parse(pushSubscribeBodySchema, request.body)
    await savePushSubscription(userIdOf(request), { endpoint, p256dh: keys.p256dh, auth: keys.auth, locale })
    return { success: true }
  })

  /** Turned off here, or signing out of this browser. */
  app.post('/push/remove', async (request): Promise<SuccessResponse> => {
    const { endpoint } = parse(pushUnsubscribeBodySchema, request.body)
    await deletePushSubscription(userIdOf(request), endpoint)
    return { success: true }
  })
}

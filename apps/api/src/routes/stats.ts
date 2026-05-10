import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.middleware'
import { deleteChatReport, getActivity, getChat, getChats, getGlobalStats, getTop } from '../services/stats.service'

const chatsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort: z.enum([
    'total_messages',
    'sent_messages',
    'received_messages',
    'last_message_at',
    'first_message_at',
    'chat_name',
    'parsed_at',
  ]).default('total_messages'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

const activityQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

const chatParamsSchema = z.object({
  chatId: z.string().regex(/^-?\d+$/),
})

const topQuerySchema = z.object({
  type: z.enum(['emoji', 'words', 'chats']).default('emoji'),
  limit: z.coerce.number().min(1).max(50).default(10),
})

export const statsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/global', { preHandler: requireAuth }, async (request) => {
    return getGlobalStats(request.authUserId!)
  })

  fastify.get('/chats', { preHandler: requireAuth }, async (request) => {
    const { page, limit, sort, order } = chatsQuerySchema.parse(request.query)
    return getChats(request.authUserId!, page, limit, sort, order)
  })

  fastify.get('/chats/:chatId', { preHandler: requireAuth }, async (request, reply) => {
    const params = chatParamsSchema.parse(request.params)
    const chat = await getChat(request.authUserId!, params.chatId)
    if (!chat) {
      return reply.status(404).send({ message: 'Chat not found' })
    }
    return chat
  })

  fastify.delete('/chats/:chatId', { preHandler: requireAuth }, async (request, reply) => {
    const params = chatParamsSchema.parse(request.params)
    const deleted = await deleteChatReport(request.authUserId!, params.chatId)
    if (!deleted) {
      return reply.status(404).send({ message: 'Chat report not found' })
    }

    return { success: true }
  })

  fastify.get('/activity', { preHandler: requireAuth }, async (request) => {
    const { from, to } = activityQuerySchema.parse(request.query)
    return getActivity(request.authUserId!, from, to)
  })

  fastify.get('/top', { preHandler: requireAuth }, async (request) => {
    const { type, limit } = topQuerySchema.parse(request.query)
    return getTop(request.authUserId!, type, limit)
  })
}

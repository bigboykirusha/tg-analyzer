import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import {
  activityQuerySchema,
  apiErrorResponseSchema,
  chatListQuerySchema,
  numericChatIdParamsSchema,
  topQuerySchema,
} from '@tg-analyzer/shared'
import { requireAuth } from '../middleware/auth.middleware'
import { sendApiError } from '../services/api-error.service'
import { deleteChatReport, getActivity, getChat, getChats, getGlobalStats, getTop } from '../services/stats.service'

const chatParamsSchema = numericChatIdParamsSchema
const errorJsonSchema = z.toJSONSchema(apiErrorResponseSchema, { target: 'draft-7' })
const chatParamsJsonSchema = {
  type: 'object',
  required: ['chatId'],
  properties: { chatId: { type: 'string', pattern: '^-?\\d+$' } },
}

export const statsRoutes: FastifyPluginAsync = async (fastify) => {
  const endpointDocs = (summary: string, response: Record<string, unknown>) => ({
    tags: ['Statistics'],
    summary,
    security: [{ bearerAuth: [] }],
    response: {
      200: response,
      400: errorJsonSchema,
      401: errorJsonSchema,
    },
  })

  fastify.get(
    '/global',
    {
      preHandler: requireAuth,
      schema: endpointDocs('Read aggregated user statistics', { type: 'object', additionalProperties: true }),
    },
    async (request) => {
      return getGlobalStats(request.authUserId!)
    },
  )

  fastify.get(
    '/chats',
    {
      preHandler: requireAuth,
      schema: {
        ...endpointDocs('List analyzed chats', {
          type: 'object',
          required: ['chats', 'total', 'page', 'limit'],
          properties: {
            chats: { type: 'array', items: { type: 'object', additionalProperties: true } },
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
          },
        }),
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            sort: {
              type: 'string',
              enum: [
                'total_messages',
                'sent_messages',
                'received_messages',
                'last_message_at',
                'first_message_at',
                'chat_name',
                'parsed_at',
              ],
              default: 'total_messages',
            },
            order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          },
        },
      },
    },
    async (request) => {
      const { page, limit, sort, order } = chatListQuerySchema.parse(request.query)
      return getChats(request.authUserId!, page, limit, sort, order)
    },
  )

  fastify.get(
    '/chats/:chatId',
    {
      preHandler: requireAuth,
      schema: {
        ...endpointDocs('Read one analyzed chat', { type: 'object', additionalProperties: true }),
        params: chatParamsJsonSchema,
      },
    },
    async (request, reply) => {
      const params = chatParamsSchema.parse(request.params)
      const chat = await getChat(request.authUserId!, params.chatId)
      if (!chat) {
        return sendApiError(reply, 404, 'Chat not found', 'CHAT_NOT_FOUND')
      }
      return chat
    },
  )

  fastify.delete(
    '/chats/:chatId',
    {
      preHandler: requireAuth,
      schema: {
        ...endpointDocs('Delete a chat report', {
          type: 'object',
          required: ['success'],
          properties: { success: { const: true } },
        }),
        params: chatParamsJsonSchema,
      },
    },
    async (request, reply) => {
      const params = chatParamsSchema.parse(request.params)
      const deleted = await deleteChatReport(request.authUserId!, params.chatId)
      if (!deleted) {
        return sendApiError(reply, 404, 'Chat report not found', 'CHAT_REPORT_NOT_FOUND')
      }

      return { success: true }
    },
  )

  fastify.get(
    '/activity',
    {
      preHandler: requireAuth,
      schema: {
        ...endpointDocs('Read daily activity', {
          type: 'object',
          required: ['daily'],
          properties: { daily: { type: 'array', items: { type: 'object', additionalProperties: true } } },
        }),
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            from: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            to: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          },
        },
      },
    },
    async (request) => {
      const { from, to } = activityQuerySchema.parse(request.query)
      return getActivity(request.authUserId!, from, to)
    },
  )

  fastify.get(
    '/top',
    {
      preHandler: requireAuth,
      schema: {
        ...endpointDocs('Read top words, emoji or chats', {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['value', 'count'],
                properties: { value: { type: 'string' }, count: { type: 'number' } },
              },
            },
          },
        }),
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            type: { type: 'string', enum: ['emoji', 'words', 'chats'], default: 'emoji' },
            limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
          },
        },
      },
    },
    async (request) => {
      const { type, limit } = topQuerySchema.parse(request.query)
      return getTop(request.authUserId!, type, limit)
    },
  )
}

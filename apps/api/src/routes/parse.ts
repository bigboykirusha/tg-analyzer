import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { CustomFile } from 'telegram/client/uploads.js'
import {
  apiErrorResponseSchema,
  clearHistoryResponseSchema,
  deleteResponseSchema,
  dialogIdParamsSchema,
  paginationQuerySchema,
  parseDialogsResponseSchema,
  parseHistoryPageResponseSchema,
  parseHistoryJobIdParamsSchema,
  parseStatusResponseSchema,
  shareReportBodySchema,
  startParseBodySchema,
  startParseResponseSchema,
} from '@tg-analyzer/shared'
import type { ParseDialogDto, ParseDialogsResponse, ParseProgressDto } from '@tg-analyzer/shared'
import { requireAuth } from '../middleware/auth.middleware'
import { parseDialogsQueue } from '../queues/parse.queue'
import { sendApiError } from '../services/api-error.service'
import { normalizeParseStatus } from '../services/parse-status.service'
import { getActiveSessionForUser, getCachedParseDialogs, getChatCooldown } from '../services/session.service'
import {
  attachBullJobId,
  cacheParseDialogs,
  cancelParseJob,
  clearActiveJob,
  clearCancelledJob,
  clearParseProgress,
  clearParseHistory,
  createParseJob,
  deactivateTelegramSessions,
  deleteParseHistoryItem,
  ensureFullParseCooldown,
  findCurrentParseJob,
  findParseJobById,
  getActiveJobId,
  getParseProgress,
  listParseHistory,
  listParseHistoryPage,
  markCancelledJob,
  markActiveJob,
  publishParseProgress,
  updateParseJob,
} from '../services/session.service'
import {
  isSystemTelegramDialog,
  isTelegramSessionDuplicatedError,
  isTelegramSessionExpiredError,
  isTelegramSessionBusyError,
  normalizeTelegramDialogType,
  telegramPool,
  withTelegramReconnectRetry,
  withFloodWaitRetry,
  type TelegramDialog,
} from '../services/telegram.service'

const PARSE_DIALOGS_LIST_LIMIT = 300
const jsonSchemaOptions = { target: 'draft-7' } as const
const apiErrorJsonSchema = z.toJSONSchema(apiErrorResponseSchema, jsonSchemaOptions)
const startBodyJsonSchema = z.toJSONSchema(startParseBodySchema, jsonSchemaOptions)
const startResponseJsonSchema = z.toJSONSchema(startParseResponseSchema, jsonSchemaOptions)
const parseStatusJsonSchema = z.toJSONSchema(parseStatusResponseSchema, jsonSchemaOptions)
const parseDialogsJsonSchema = z.toJSONSchema(parseDialogsResponseSchema, jsonSchemaOptions)
const parseHistoryPageJsonSchema = z.toJSONSchema(parseHistoryPageResponseSchema, jsonSchemaOptions)
const paginationQueryJsonSchema = z.toJSONSchema(paginationQuerySchema, jsonSchemaOptions)
const successJsonSchema = z.toJSONSchema(deleteResponseSchema, jsonSchemaOptions)
const clearHistoryJsonSchema = z.toJSONSchema(clearHistoryResponseSchema, jsonSchemaOptions)

function parseRouteDocs(summary: string, response: Record<number, unknown>, body?: object) {
  return {
    summary,
    tags: ['parse'],
    security: [{ bearerAuth: [] }],
    ...(body ? { body } : {}),
    response,
  }
}

function mapParseDialogs(dialogs: TelegramDialog[]): ParseDialogsResponse {
  const filteredDialogs = dialogs.filter((dialog) => !isSystemTelegramDialog(dialog))
  const mapped: ParseDialogDto[] = filteredDialogs.map((dialog) => ({
    id: String(dialog.id),
    title: dialog.title ?? dialog.name ?? String(dialog.id),
    type: normalizeTelegramDialogType(dialog),
    hasAvatar: Boolean(dialog.entity?.photo ?? dialog.photo),
  }))

  return {
    dialogs: mapped,
    truncated: dialogs.length === PARSE_DIALOGS_LIST_LIMIT,
    total: filteredDialogs.length,
  }
}

export const parseRoutes: FastifyPluginAsync<{ apiVersion: 0 | 1 }> = async (fastify, options) => {
  fastify.post(
    '/start',
    {
      preHandler: requireAuth,
      schema:
        options.apiVersion === 1
          ? parseRouteDocs(
              'Start a chat analysis job',
              {
                200: startResponseJsonSchema,
                400: apiErrorJsonSchema,
                401: apiErrorJsonSchema,
                409: apiErrorJsonSchema,
                429: apiErrorJsonSchema,
              },
              startBodyJsonSchema,
            )
          : undefined,
    },
    async (request, reply) => {
      const userId = request.authUserId!
      const { chatIds } = startParseBodySchema.parse(request.body ?? {})

      const activeMarker = await getActiveJobId(userId)
      const activeJob = await findCurrentParseJob(userId)

      if (activeMarker && !activeJob) {
        await clearActiveJob(userId)
      }

      if (activeJob) {
        // Check if the job is actually alive in BullMQ
        let isAlive = true
        if (activeJob.bullJobId) {
          const bullJob = await parseDialogsQueue.getJob(activeJob.bullJobId)
          if (!bullJob) {
            isAlive = false
          } else {
            const state = await bullJob.getState()
            if (['completed', 'failed', 'unknown'].includes(state)) {
              isAlive = false
            }
          }
        }

        if (!isAlive) {
          await updateParseJob(activeJob.id, {
            status: 'failed',
            errorMessage: 'Job stalled or disappeared from queue',
            completedAt: new Date(),
          })
          await clearActiveJob(userId)
        } else {
          return sendApiError(reply, 409, 'A parse job is already running', 'PARSE_ALREADY_RUNNING')
        }
      }

      const session = await getActiveSessionForUser(userId)
      if (!session) {
        return sendApiError(reply, 401, 'Telegram session expired', 'TELEGRAM_REAUTH_REQUIRED')
      }

      let targetChat: { id: number; title: string } | null = null
      if (chatIds?.length === 1) {
        const selectedChatId = chatIds[0]
        if (!selectedChatId) {
          return sendApiError(reply, 400, 'A chat id is required', 'INVALID_REQUEST')
        }
        const ttl = await getChatCooldown(userId, selectedChatId)
        if (ttl && ttl > 0) {
          return sendApiError(reply, 429, 'This chat was recently parsed', 'PARSE_COOLDOWN')
        }

        let dialogs: TelegramDialog[]
        try {
          dialogs = await withTelegramReconnectRetry(
            async () => {
              const client = await telegramPool.connectAuthorizedClient(userId, session)
              return (await withFloodWaitRetry(() => client.getDialogs({ limit: 500 }))) as unknown as TelegramDialog[]
            },
            async () => {
              await telegramPool.disconnectAuthorizedClient(userId)
            },
          )
        } catch (error) {
          if (isTelegramSessionExpiredError(error)) {
            await deactivateTelegramSessions(userId)
            await telegramPool.disconnectAuthorizedClient(userId)
            return sendApiError(reply, 401, 'Telegram session expired', 'TELEGRAM_REAUTH_REQUIRED')
          }
          if (isTelegramSessionDuplicatedError(error) || isTelegramSessionBusyError(error)) {
            await telegramPool.disconnectAuthorizedClient(userId)
            return sendApiError(
              reply,
              409,
              'Telegram session is busy. If you have an active parse running, wait for it or cancel it.',
              'TELEGRAM_SESSION_BUSY',
            )
          }
          throw error
        } finally {
          await telegramPool.disconnectAuthorizedClient(userId)
        }

        const dialog = dialogs.find((item) => String(item.id) === selectedChatId && !isSystemTelegramDialog(item))
        targetChat = dialog
          ? {
              id: Number(dialog.id),
              title: dialog.title ?? dialog.name ?? String(dialog.id),
            }
          : null
      } else if (!chatIds?.length) {
        try {
          await ensureFullParseCooldown(userId)
        } catch {
          return sendApiError(reply, 429, 'Full parse cooldown is still active', 'PARSE_COOLDOWN')
        }
      }

      if (chatIds?.length === 1 && !targetChat) {
        return sendApiError(reply, 404, 'Chat not found or unavailable for parsing', 'CHAT_NOT_FOUND')
      }

      let jobId: string
      try {
        jobId = await createParseJob({
          userId,
          chatId: targetChat?.id ?? null,
          chatName: targetChat?.title ?? null,
          chatIds,
        })
      } catch (error) {
        if ((error as { code?: string }).code === '23505') {
          return sendApiError(reply, 409, 'A parse job is already running', 'PARSE_JOB_ACTIVE')
        }
        throw error
      }

      let bullJobId: string | null = null
      try {
        await publishParseProgress(userId, {
          jobId,
          current: 0,
          total: chatIds?.length ?? 0,
          chatId: targetChat ? String(targetChat.id) : null,
          chatName: targetChat?.title ?? '',
          status: 'pending',
          message: chatIds?.length
            ? `Queued ${chatIds.length} selected chat${chatIds.length === 1 ? '' : 's'}`
            : 'Queued full parse',
        })

        const bullJob = await parseDialogsQueue.add(
          'parse-dialogs',
          {
            userId,
            jobId,
            chatIds,
          },
          { jobId },
        )
        bullJobId = String(bullJob.id)

        await attachBullJobId(jobId, bullJobId)
        await markActiveJob(userId, jobId)
        return { jobId }
      } catch (error) {
        if (bullJobId) {
          const queuedJob = await parseDialogsQueue.getJob(bullJobId)
          if (queuedJob) {
            await queuedJob.remove().catch(() => undefined)
          }
        }

        const errorMessage = error instanceof Error ? error.message : 'Could not queue parse job'
        await updateParseJob(jobId, {
          status: 'failed',
          errorMessage,
          completedAt: new Date(),
        })
        await clearActiveJob(userId)
        await publishParseProgress(userId, {
          type: 'failed',
          jobId,
          chatId: targetChat ? String(targetChat.id) : null,
          status: 'failed',
          message: errorMessage,
        })

        return sendApiError(reply, 503, 'Could not queue parse job', 'QUEUE_UNAVAILABLE')
      }
    },
  )

  fastify.get(
    '/status',
    {
      preHandler: requireAuth,
      schema:
        options.apiVersion === 1
          ? parseRouteDocs('Get active analysis status', { 200: parseStatusJsonSchema, 401: apiErrorJsonSchema })
          : undefined,
    },
    async (request) => {
      const userId = request.authUserId!
      const active = await findCurrentParseJob(userId)
      const progress = await getParseProgress(userId)
      const normalized = normalizeParseStatus({
        activeJob: active
          ? {
              id: active.id,
              status: active.status,
              chatId: active.chatId ?? null,
            }
          : null,
        cachedProgress: progress as Partial<ParseProgressDto> | null,
      })

      if (!active && progress) {
        await clearParseProgress(userId)
      }

      return normalized
    },
  )

  fastify.get(
    '/dialogs',
    {
      preHandler: requireAuth,
      schema:
        options.apiVersion === 1
          ? parseRouteDocs('List available Telegram chats', {
              200: parseDialogsJsonSchema,
              401: apiErrorJsonSchema,
              409: apiErrorJsonSchema,
            })
          : undefined,
    },
    async (request, reply) => {
      const userId = request.authUserId!
      const session = await getActiveSessionForUser(userId)
      if (!session) {
        return sendApiError(reply, 401, 'Telegram session expired', 'TELEGRAM_REAUTH_REQUIRED')
      }

      try {
        const dialogs = await withTelegramReconnectRetry(
          async () => {
            const client = await telegramPool.connectAuthorizedClient(userId, session)
            return (await withFloodWaitRetry(() =>
              client.getDialogs({ limit: PARSE_DIALOGS_LIST_LIMIT }),
            )) as unknown as TelegramDialog[]
          },
          async () => {
            await telegramPool.disconnectAuthorizedClient(userId)
          },
        )
        const result = mapParseDialogs(dialogs)
        await cacheParseDialogs(userId, result)

        return result
      } catch (error) {
        if (isTelegramSessionExpiredError(error)) {
          await deactivateTelegramSessions(userId)
          await telegramPool.disconnectAuthorizedClient(userId)
          return sendApiError(reply, 401, 'Telegram session expired', 'TELEGRAM_REAUTH_REQUIRED')
        }
        if (isTelegramSessionDuplicatedError(error) || isTelegramSessionBusyError(error)) {
          await telegramPool.disconnectAuthorizedClient(userId)
          const cached = await getCachedParseDialogs(userId)
          if (cached) {
            return cached
          }

          return sendApiError(reply, 409, 'Telegram session is busy with another operation', 'TELEGRAM_BUSY')
        }
        throw error
      } finally {
        await telegramPool.disconnectAuthorizedClient(userId)
      }
    },
  )

  fastify.get(
    '/dialogs/:dialogId/avatar',
    {
      preHandler: requireAuth,
      schema:
        options.apiVersion === 1
          ? parseRouteDocs('Get Telegram chat avatar', {
              200: { type: 'string', format: 'binary' },
              401: apiErrorJsonSchema,
              404: apiErrorJsonSchema,
              409: apiErrorJsonSchema,
            })
          : undefined,
    },
    async (request, reply) => {
      const userId = request.authUserId!
      const params = dialogIdParamsSchema.parse(request.params)
      const session = await getActiveSessionForUser(userId)
      if (!session) {
        return sendApiError(reply, 401, 'Telegram session expired', 'TELEGRAM_REAUTH_REQUIRED')
      }

      let avatar: Buffer | null | undefined
      try {
        avatar = await withTelegramReconnectRetry(
          async () => {
            const client = await telegramPool.connectAuthorizedClient(userId, session)
            return telegramPool.getDialogAvatar(userId, params.dialogId, client)
          },
          async () => {
            await telegramPool.disconnectAuthorizedClient(userId)
          },
        )
      } catch (error) {
        if (isTelegramSessionExpiredError(error)) {
          await deactivateTelegramSessions(userId)
          await telegramPool.disconnectAuthorizedClient(userId)
          return sendApiError(reply, 401, 'Telegram session expired', 'TELEGRAM_REAUTH_REQUIRED')
        }
        if (isTelegramSessionDuplicatedError(error) || isTelegramSessionBusyError(error)) {
          await telegramPool.disconnectAuthorizedClient(userId)
          return sendApiError(reply, 409, 'Telegram session is busy with another operation', 'TELEGRAM_BUSY')
        }
        throw error
      } finally {
        await telegramPool.disconnectAuthorizedClient(userId)
      }

      if (!avatar) {
        return sendApiError(reply, 404, 'Avatar not found', 'AVATAR_NOT_FOUND')
      }

      reply.header('Content-Type', 'image/jpeg')
      reply.header('Cache-Control', 'private, max-age=3600')
      return reply.send(avatar)
    },
  )

  fastify.post(
    '/share-report',
    {
      preHandler: requireAuth,
      bodyLimit: 25 * 1024 * 1024,
      schema:
        options.apiVersion === 1
          ? parseRouteDocs(
              'Share an analysis report in Telegram',
              {
                200: successJsonSchema,
                400: apiErrorJsonSchema,
                401: apiErrorJsonSchema,
                409: apiErrorJsonSchema,
              },
              {
                type: 'object',
                additionalProperties: false,
                properties: {
                  chatId: { type: 'string', pattern: '^-?\\d+$' },
                  fileName: { type: 'string', minLength: 1, maxLength: 200 },
                  mimeType: { type: 'string', minLength: 1, maxLength: 100, default: 'application/pdf' },
                  base64: { type: 'string', minLength: 1, maxLength: 30000000 },
                },
                required: ['chatId', 'fileName', 'base64'],
              },
            )
          : undefined,
    },
    async (request, reply) => {
      const userId = request.authUserId!
      const payload = shareReportBodySchema.parse(request.body ?? {})
      const session = await getActiveSessionForUser(userId)
      if (!session) {
        return sendApiError(reply, 401, 'Telegram session expired', 'TELEGRAM_REAUTH_REQUIRED')
      }

      const fileBuffer = Buffer.from(payload.base64, 'base64')
      if (!fileBuffer.length) {
        return sendApiError(reply, 400, 'Invalid file payload')
      }

      try {
        await withTelegramReconnectRetry(
          async () => {
            const client = await telegramPool.connectAuthorizedClient(userId, session)
            const upload = new CustomFile(payload.fileName, fileBuffer.length, '', fileBuffer)

            await withFloodWaitRetry(() =>
              client.sendFile(payload.chatId, {
                file: upload,
                caption: '',
                forceDocument: true,
                workers: 1,
              }),
            )
          },
          async () => {
            await telegramPool.disconnectAuthorizedClient(userId)
          },
        )

        return { success: true as const }
      } catch (error) {
        if (isTelegramSessionExpiredError(error)) {
          await deactivateTelegramSessions(userId)
          await telegramPool.disconnectAuthorizedClient(userId)
          return sendApiError(reply, 401, 'Telegram session expired', 'TELEGRAM_REAUTH_REQUIRED')
        }
        if (isTelegramSessionDuplicatedError(error) || isTelegramSessionBusyError(error)) {
          await telegramPool.disconnectAuthorizedClient(userId)
          return sendApiError(reply, 409, 'Telegram is busy with another operation')
        }
        throw error
      } finally {
        await telegramPool.disconnectAuthorizedClient(userId)
      }
    },
  )

  fastify.delete(
    '/cancel',
    {
      preHandler: requireAuth,
      schema:
        options.apiVersion === 1
          ? parseRouteDocs('Cancel active analysis', {
              200: successJsonSchema,
              401: apiErrorJsonSchema,
              404: apiErrorJsonSchema,
            })
          : undefined,
    },
    async (request, reply) => {
      const userId = request.authUserId!
      const activeMarker = await getActiveJobId(userId)
      const active = await findCurrentParseJob(userId)
      const markerJob = activeMarker ? await findParseJobById(activeMarker) : null
      const targetJob = active ?? (markerJob?.userId === userId ? markerJob : null)

      if ((!targetJob || markerJob?.userId !== userId) && activeMarker) {
        await clearActiveJob(userId)
      }

      if (!targetJob) {
        return sendApiError(reply, 404, 'No active parse job', 'PARSE_NOT_ACTIVE')
      }

      await markCancelledJob(userId, targetJob.id)

      let removedFromQueue = false
      if (targetJob.bullJobId) {
        const bullJob = await parseDialogsQueue.getJob(targetJob.bullJobId as never)
        const state = bullJob ? await bullJob.getState() : null
        if (bullJob && state && !['active', 'completed', 'failed'].includes(state)) {
          await bullJob.remove()
          removedFromQueue = true
        }
      }

      const cancelled = await cancelParseJob(userId, targetJob.id)
      if (!cancelled) {
        await clearActiveJob(userId)
        return sendApiError(reply, 404, 'No active parse job', 'PARSE_NOT_ACTIVE')
      }
      await clearActiveJob(userId)
      await clearParseProgress(userId)
      await publishParseProgress(userId, {
        type: 'cancelled',
        jobId: targetJob.id,
        chatId: targetJob.chatId ? String(targetJob.chatId) : null,
        status: 'cancelled',
        message: 'Parse cancelled',
      })
      if (removedFromQueue || !targetJob.bullJobId) {
        await clearCancelledJob(userId, targetJob.id)
      }
      return { success: true }
    },
  )

  fastify.get(
    '/history',
    {
      preHandler: requireAuth,
      schema:
        options.apiVersion === 1
          ? {
              tags: ['parse'],
              summary: 'List parse history',
              security: [{ bearerAuth: [] }],
              querystring: paginationQueryJsonSchema,
              response: {
                200: parseHistoryPageJsonSchema,
                400: apiErrorJsonSchema,
                401: apiErrorJsonSchema,
              },
            }
          : undefined,
    },
    async (request) => {
      const userId = request.authUserId!
      const { page, limit } = paginationQuerySchema.parse(request.query)
      const historyPage =
        options.apiVersion === 1
          ? await listParseHistoryPage(userId, page, limit)
          : { items: await listParseHistory(userId), total: 0 }
      const items = historyPage.items.map((item) => ({
        jobId: item.id,
        chatId: item.chatId ? String(item.chatId) : null,
        chatName: item.chatName ?? null,
        status: item.status,
        totalChats: item.totalChats,
        parsedChats: item.parsedChats,
        totalMessages: item.totalMessages,
        createdAt: item.createdAt.toISOString(),
        startedAt: item.startedAt?.toISOString() ?? null,
        completedAt: item.completedAt?.toISOString() ?? null,
        errorMessage: item.errorMessage ?? null,
      }))
      return options.apiVersion === 1 ? { items, total: historyPage.total, page, limit } : items
    },
  )

  fastify.delete(
    '/history',
    {
      preHandler: requireAuth,
      schema:
        options.apiVersion === 1
          ? parseRouteDocs('Clear analysis history', {
              200: clearHistoryJsonSchema,
              401: apiErrorJsonSchema,
            })
          : undefined,
    },
    async (request) => {
      const userId = request.authUserId!
      const deleted = await clearParseHistory(userId)
      return { success: true, deleted }
    },
  )

  fastify.delete(
    '/history/:jobId',
    {
      preHandler: requireAuth,
      schema:
        options.apiVersion === 1
          ? {
              ...parseRouteDocs('Delete a completed analysis history item', {
                200: successJsonSchema,
                400: apiErrorJsonSchema,
                401: apiErrorJsonSchema,
                404: apiErrorJsonSchema,
                409: apiErrorJsonSchema,
              }),
              params: {
                type: 'object',
                properties: { jobId: { type: 'string', format: 'uuid' } },
                required: ['jobId'],
              },
            }
          : undefined,
    },
    async (request, reply) => {
      const userId = request.authUserId!
      const params = parseHistoryJobIdParamsSchema.parse(request.params)
      const job = await findParseJobById(params.jobId)

      if (!job || job.userId !== userId) {
        return sendApiError(reply, 404, 'Parse job not found', 'PARSE_JOB_NOT_FOUND')
      }

      if (job.status === 'pending' || job.status === 'running') {
        return sendApiError(reply, 409, 'Active parse jobs cannot be deleted', 'PARSE_JOB_ACTIVE')
      }

      await deleteParseHistoryItem(userId, params.jobId)
      return { success: true }
    },
  )
}

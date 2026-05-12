import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import type { ParseDialogDto, ParseDialogsResponse } from '@tg-analyzer/shared'
import { requireAuth } from '../middleware/auth.middleware'
import { parseDialogsQueue } from '../queues/parse.queue'
import { sendApiError } from '../services/api-error.service'
import { getActiveSessionForUser, getCachedParseDialogs, getChatCooldown } from '../services/session.service'
import {
  attachBullJobId,
  cacheParseDialogs,
  clearActiveJob,
  clearCancelledJob,
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
  markCancelledJob,
  markActiveJob,
  publishParseProgress,
  setChatCooldown,
  updateParseJob,
} from '../services/session.service'
import {
  isTelegramSessionExpiredError,
  isTelegramSessionBusyError,
  normalizeTelegramDialogType,
  telegramPool,
  withFloodWaitRetry,
  type TelegramDialog,
} from '../services/telegram.service'

const startSchema = z.object({
  chatIds: z.array(z.string().regex(/^-?\d+$/)).max(500).optional(),
})

const CHAT_REPARSE_COOLDOWN_SECONDS = 60 * 60

function mapParseDialogs(dialogs: TelegramDialog[]): ParseDialogsResponse {
  const mapped: ParseDialogDto[] = dialogs.map((dialog) => ({
    id: String(dialog.id),
    title: dialog.title ?? dialog.name ?? String(dialog.id),
    type: normalizeTelegramDialogType(dialog),
    hasAvatar: Boolean(dialog.entity?.photo ?? dialog.photo),
  }))

  return {
    dialogs: mapped,
    truncated: dialogs.length === 500,
    total: dialogs.length,
  }
}

export const parseRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/start', { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.authUserId!
    const { chatIds } = startSchema.parse(request.body ?? {})

    const activeMarker = await getActiveJobId(userId)
    const activeJob = await findCurrentParseJob(userId)

    if (activeMarker && !activeJob) {
      await clearActiveJob(userId)
    }

    if (activeMarker && activeJob) {
      return reply.status(409).send({ message: 'A parse job is already running' })
    }

    const session = await getActiveSessionForUser(userId)
    if (!session) {
      return sendApiError(reply, 401, 'Telegram session expired', 'TELEGRAM_REAUTH_REQUIRED')
    }

    let targetChat: { id: number; title: string } | null = null
    if (chatIds?.length === 1) {
      const ttl = await getChatCooldown(userId, chatIds[0])
      if (ttl && ttl > 0) {
        return reply.status(429).send({
          message: 'This chat was recently parsed.',
          retryAfter: ttl,
        })
      }

      let dialogs: TelegramDialog[]
      try {
        const client = await telegramPool.connectAuthorizedClient(userId, session)
        dialogs = await withFloodWaitRetry(() => client.getDialogs({ limit: 500 })) as unknown as TelegramDialog[]
      } catch (error) {
        if (isTelegramSessionExpiredError(error)) {
          await deactivateTelegramSessions(userId)
          await telegramPool.disconnectAuthorizedClient(userId)
          return sendApiError(reply, 401, 'Telegram session expired', 'TELEGRAM_REAUTH_REQUIRED')
        }
        if (isTelegramSessionBusyError(error)) {
          return reply.status(409).send({ message: 'Telegram session is busy with another operation' })
        }
        throw error
      } finally {
        await telegramPool.disconnectAuthorizedClient(userId)
      }

      const dialog = dialogs.find((item) => String(item.id) === chatIds[0])
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
        return reply.status(429).send({ message: 'Full parse cooldown is still active' })
      }
    }

    const jobId = await createParseJob({
      userId,
      chatId: targetChat?.id ?? null,
      chatName: targetChat?.title ?? null,
    })
    await publishParseProgress(userId, {
      current: 0,
      total: chatIds?.length ?? 0,
      chatId: targetChat ? String(targetChat.id) : null,
      chatName: targetChat?.title ?? '',
      status: 'pending',
      message: chatIds?.length
        ? `Queued ${chatIds.length} selected chat${chatIds.length === 1 ? '' : 's'}`
        : 'Queued full parse',
    })

    const bullJob = await parseDialogsQueue.add('parse-dialogs', {
      userId,
      jobId,
      chatIds,
    })

    await attachBullJobId(jobId, String(bullJob.id))
    await markActiveJob(userId, jobId)
    if (chatIds?.length === 1) {
      await setChatCooldown(userId, chatIds[0], CHAT_REPARSE_COOLDOWN_SECONDS)
    }
    return { jobId }
  })

  fastify.get('/status', { preHandler: requireAuth }, async (request) => {
    const userId = request.authUserId!
    const active = await findCurrentParseJob(userId)
    const progress = await getParseProgress(userId)

    return {
      jobId: active?.id ?? null,
      status: active?.status ?? 'idle',
      progress: progress ?? {
        current: 0,
        total: 0,
        chatId: active?.chatId ? String(active.chatId) : null,
        chatName: '',
        status: active?.status ?? 'idle',
        message: active?.status === 'pending' ? 'Queued parse job' : undefined,
      },
    }
  })

  fastify.get('/dialogs', { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.authUserId!
    const session = await getActiveSessionForUser(userId)
    if (!session) {
      return sendApiError(reply, 401, 'Telegram session expired', 'TELEGRAM_REAUTH_REQUIRED')
    }

    try {
      const client = await telegramPool.connectAuthorizedClient(userId, session)
      const dialogs = await withFloodWaitRetry(() => client.getDialogs({ limit: 500 })) as unknown as TelegramDialog[]
      const result = mapParseDialogs(dialogs)
      await cacheParseDialogs(userId, result)

      return result
    } catch (error) {
      if (isTelegramSessionExpiredError(error)) {
        await deactivateTelegramSessions(userId)
        await telegramPool.disconnectAuthorizedClient(userId)
        return sendApiError(reply, 401, 'Telegram session expired', 'TELEGRAM_REAUTH_REQUIRED')
      }
      if (isTelegramSessionBusyError(error)) {
        const cached = await getCachedParseDialogs(userId)
        if (cached) {
          return cached
        }

        return reply.status(409).send({ message: 'Telegram session is busy with another operation' })
      }
      throw error
    } finally {
      await telegramPool.disconnectAuthorizedClient(userId)
    }
  })

  fastify.get('/dialogs/:dialogId/avatar', { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.authUserId!
    const params = z.object({ dialogId: z.string() }).parse(request.params)
    const session = await getActiveSessionForUser(userId)
    if (!session) {
      return sendApiError(reply, 401, 'Telegram session expired', 'TELEGRAM_REAUTH_REQUIRED')
    }

    let avatar: Buffer | null = null
    try {
      const client = await telegramPool.connectAuthorizedClient(userId, session)
      avatar = await telegramPool.getDialogAvatar(userId, params.dialogId, client)
    } catch (error) {
      if (isTelegramSessionExpiredError(error)) {
        await deactivateTelegramSessions(userId)
        await telegramPool.disconnectAuthorizedClient(userId)
        return sendApiError(reply, 401, 'Telegram session expired', 'TELEGRAM_REAUTH_REQUIRED')
      }
      if (isTelegramSessionBusyError(error)) {
        return reply.status(409).send({ message: 'Telegram session is busy with another operation' })
      }
      throw error
    } finally {
      await telegramPool.disconnectAuthorizedClient(userId)
    }

    if (!avatar) {
      return reply.status(404).send({ message: 'Avatar not found' })
    }

    reply.header('Content-Type', 'image/jpeg')
    reply.header('Cache-Control', 'private, max-age=3600')
    return reply.send(avatar)
  })

  fastify.delete('/cancel', { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.authUserId!
    const activeMarker = await getActiveJobId(userId)
    const active = await findCurrentParseJob(userId)
    const targetJob = active ?? (activeMarker ? await findParseJobById(activeMarker) : null)

    if (!targetJob && activeMarker) {
      await clearActiveJob(userId)
    }

    if (!targetJob) {
      return reply.status(404).send({ message: 'No active parse job' })
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

    await updateParseJob(targetJob.id, {
      status: 'cancelled',
      completedAt: new Date(),
    })
    await clearActiveJob(userId)
    await publishParseProgress(userId, {
      type: 'cancelled',
      chatId: targetJob.chatId ? String(targetJob.chatId) : null,
      status: 'cancelled',
      message: 'Parse cancelled',
    })
    if (removedFromQueue || !targetJob.bullJobId) {
      await clearCancelledJob(userId, targetJob.id)
    }
    return { success: true }
  })

  fastify.get('/history', { preHandler: requireAuth }, async (request) => {
    const userId = request.authUserId!
    const history = await listParseHistory(userId)
    return history.map((item) => ({
      jobId: item.id,
      chatId: item.chatId ? String(item.chatId) : null,
      chatName: item.chatName ?? null,
      status: item.status,
      totalChats: item.totalChats,
      parsedChats: item.parsedChats,
      totalMessages: item.totalMessages,
      createdAt: item.createdAt.toISOString(),
      completedAt: item.completedAt?.toISOString() ?? null,
      errorMessage: item.errorMessage ?? null,
    }))
  })

  fastify.delete('/history', { preHandler: requireAuth }, async (request) => {
    const userId = request.authUserId!
    const deleted = await clearParseHistory(userId)
    return { success: true, deleted }
  })

  fastify.delete('/history/:jobId', { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.authUserId!
    const params = z.object({ jobId: z.string().uuid() }).parse(request.params)
    const job = await findParseJobById(params.jobId)

    if (!job || job.userId !== userId) {
      return reply.status(404).send({ message: 'Parse job not found' })
    }

    if (job.status === 'pending' || job.status === 'running') {
      return reply.status(409).send({ message: 'Active parse jobs cannot be deleted' })
    }

    await deleteParseHistoryItem(userId, params.jobId)
    return { success: true }
  })
}

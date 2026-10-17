import {
  ANALYZABLE_CHAT_TYPES,
  avatarsBodySchema,
  type AvatarsResponse,
  jobIdParamsSchema,
  paginationQuerySchema,
  startParseBodySchema,
  type ClearHistoryResponse,
  type DialogsResponse,
  type Page,
  type ParseJobDto,
  type ParseProgressDto,
  type StartParseResponse,
  type SuccessResponse,
} from '@tg-analyzer/shared'
import type { FastifyPluginAsync } from 'fastify'
import { parse } from '../../http/validation'
import { ApiError, conflict, notFound } from '../../lib/errors'
import { telegramReauthRequired, withUserTelegram } from '../account/telegram-access'
import { hasActiveTelegramSession } from '../account/telegram-sessions'
import { requireAuth, userIdOf } from '../auth/guard'
import {
  cancelActiveJob,
  createJob,
  deleteFinishedJob,
  deleteFinishedJobs,
  failJob,
  findActiveJob,
  listJobs,
  toJobDto,
} from './jobs'
import { enqueueAnalysis, removeQueuedAnalysis } from './queue'
import {
  cacheAvatar,
  cacheDialogs,
  cooldownSeconds,
  idleProgress,
  publishProgress,
  readCachedAvatars,
  readCachedDialogs,
  readProgress,
} from './state'

export const parseRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  app.get('/dialogs', async (request): Promise<DialogsResponse> => {
    const userId = userIdOf(request)
    try {
      const result = await withUserTelegram(userId, (api) => api.listDialogs())
      await cacheDialogs(userId, result)
      return { ...result, stale: false }
    } catch (error) {
      // While an analysis holds the Telegram session, serve the last known list.
      const cached =
        error instanceof ApiError && error.code === 'TELEGRAM_BUSY' ? await readCachedDialogs(userId) : null
      if (cached) return { ...cached, stale: true }
      throw error
    }
  })

  app.post('/avatars', async (request): Promise<AvatarsResponse> => {
    const userId = userIdOf(request)
    const { chatIds } = parse(avatarsBodySchema, request.body)
    const cached = await readCachedAvatars(userId, [...new Set(chatIds)])
    const missing = [...cached].filter(([, value]) => value === undefined).map(([chatId]) => chatId)

    if (missing.length) {
      try {
        await withUserTelegram(
          userId,
          async (api) => {
            for (const chatId of missing) {
              const photo = await api.downloadAvatar(chatId).catch(() => null)
              const dataUrl = photo ? `data:image/jpeg;base64,${photo.toString('base64')}` : null
              cached.set(chatId, dataUrl)
              await cacheAvatar(userId, chatId, dataUrl)
            }
          },
          { waitMs: 3_000 },
        )
      } catch (error) {
        // Avatars are decorative: while Telegram is busy, return what is cached.
        if (!(error instanceof ApiError && error.code === 'TELEGRAM_BUSY')) throw error
      }
    }

    return {
      avatars: Object.fromEntries([...cached].filter(([, value]) => value !== undefined)) as Record<
        string,
        string | null
      >,
    }
  })

  app.get('/status', async (request): Promise<ParseProgressDto> => {
    const userId = userIdOf(request)
    const job = await findActiveJob(userId)
    if (!job) return idleProgress()

    const snapshot = await readProgress(userId)
    if (snapshot?.jobId === job.id) return snapshot
    return {
      ...idleProgress(),
      jobId: job.id,
      status: job.status,
      phase: job.status === 'pending' ? 'queued' : 'connecting',
      chatId: job.chatId === null ? null : String(job.chatId),
      chatTitle: job.chatTitle,
      startedAt: (job.startedAt ?? job.createdAt).getTime(),
    }
  })

  app.post('/start', async (request): Promise<StartParseResponse> => {
    const userId = userIdOf(request)
    const { chatId } = parse(startParseBodySchema, request.body)

    if (!(await hasActiveTelegramSession(userId))) throw telegramReauthRequired()

    const cooldown = await cooldownSeconds(userId, chatId)
    if (cooldown > 0) throw new ApiError(429, 'PARSE_COOLDOWN', 'This chat was analysed recently', cooldown)

    const dialog = (await readCachedDialogs(userId))?.dialogs.find((item) => item.id === chatId)
    if (dialog && !(ANALYZABLE_CHAT_TYPES as readonly string[]).includes(dialog.type)) {
      throw new ApiError(400, 'CHAT_NOT_FOUND', 'Only private chats and groups can be analysed')
    }

    const job = await createJob({ userId, chatId, chatTitle: dialog?.title ?? null })
    if (!job) throw conflict('PARSE_ALREADY_RUNNING', 'Another analysis is already running')

    try {
      await publishProgress(userId, {
        ...idleProgress(),
        jobId: job.id,
        status: 'pending',
        phase: 'queued',
        chatId,
        chatTitle: job.chatTitle,
        startedAt: job.createdAt.getTime(),
      })
      await enqueueAnalysis({ userId, jobId: job.id })
    } catch (error) {
      request.log.error({ err: error, jobId: job.id }, 'could not queue analysis')
      await failJob(job.id, 'internal')
      await publishProgress(userId, idleProgress()).catch(() => undefined)
      throw new ApiError(503, 'QUEUE_UNAVAILABLE', 'Analysis queue is unavailable, try again later')
    }

    return { jobId: job.id }
  })

  app.post('/cancel', async (request): Promise<SuccessResponse> => {
    const userId = userIdOf(request)
    const job = await cancelActiveJob(userId)
    if (!job) throw notFound('PARSE_NOT_ACTIVE', 'No active analysis')

    // A running job notices the cancellation on its next page and stops.
    await removeQueuedAnalysis(job.id)
    await publishProgress(userId, {
      ...idleProgress(),
      jobId: job.id,
      status: 'cancelled',
      chatId: job.chatId === null ? null : String(job.chatId),
      chatTitle: job.chatTitle,
    })
    return { success: true }
  })

  app.get('/history', async (request): Promise<Page<ParseJobDto>> => {
    const { page, limit } = parse(paginationQuerySchema, request.query)
    const { items, total } = await listJobs(userIdOf(request), page, limit)
    return { items: items.map(toJobDto), total, page, limit }
  })

  app.delete('/history', async (request): Promise<ClearHistoryResponse> => {
    return { success: true, deleted: await deleteFinishedJobs(userIdOf(request)) }
  })

  app.delete('/history/:jobId', async (request): Promise<SuccessResponse> => {
    const { jobId } = parse(jobIdParamsSchema, request.params)
    const result = await deleteFinishedJob(userIdOf(request), jobId)
    if (result === 'not_found') throw notFound()
    if (result === 'active') throw conflict('PARSE_JOB_ACTIVE', 'An active analysis cannot be deleted')
    return { success: true }
  })
}

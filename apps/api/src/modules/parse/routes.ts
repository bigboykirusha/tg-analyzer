import {
  ANALYZABLE_CHAT_TYPES,
  avatarsBodySchema,
  cancelParseBodySchema,
  MIN_REPORT_MESSAGES,
  type AvatarsResponse,
  jobIdParamsSchema,
  paginationQuerySchema,
  parseStatusQuerySchema,
  startParseBodySchema,
  type ClearHistoryResponse,
  type DialogDto,
  type DialogsResponse,
  type Page,
  type ParseJobDto,
  type ParseProgressDto,
  type RecentActivityResponse,
  type StartParseResponse,
  type SuccessResponse,
} from '@tg-analyzer/shared'
import type { FastifyPluginAsync } from 'fastify'
import { config } from '../../config'
import { parse } from '../../http/validation'
import { ApiError, conflict, notFound } from '../../lib/errors'
import { telegramReauthRequired, withUserTelegram } from '../account/telegram-access'
import { hasActiveTelegramSession } from '../account/telegram-sessions'
import { requireAuth, userIdOf } from '../auth/guard'
import {
  cancelActiveJob,
  deleteFinishedJob,
  deleteFinishedJobs,
  failJob,
  findJob,
  listJobs,
  toJobDto,
  listUserActiveJobs,
} from './jobs'
import { admitAnalysis } from './admission'
import { enqueueAnalysis, removeQueuedAnalysis } from './queue'
import {
  cacheAvatar,
  cacheDialogs,
  cacheRecentActivity,
  cooldownSeconds,
  idleProgress,
  publishProgress,
  readCachedAvatars,
  readCachedDialogs,
  readCachedRecentActivity,
  readSmallChats,
  rememberChatSize,
  readProgress,
} from './state'

const DAY_MS = 86_400_000

/** The home summary looks at private chats with messages in this many days. */
const RECENT_DAYS = 30
/** The summary lists at most this many chats… */
const RECENT_CHAT_LIMIT = 10
/** …and asks Telegram about at most this many (two searches each); chats known to be too small cost nothing. */
const RECENT_SCAN_LIMIT = 16
/** A summary younger than this is served from the cache. */
const RECENT_FRESH_MS = 60 * 60 * 1000

/** A user may queue this many chats at once, the running one included. */
const MAX_QUEUED_ANALYSES = 10

/** All messages in the chat, counted by Telegram in one request; null when Telegram cannot answer now. */
async function countChatMessages(userId: string, chatId: string) {
  try {
    const counts = await withUserTelegram(userId, (api) => api.countRecent(chatId, new Date()), { waitMs: 1_000 })
    await rememberChatSize(userId, chatId, counts.total, MIN_REPORT_MESSAGES).catch(() => undefined)
    return counts.total
  } catch {
    return null
  }
}

/** Dialogs Telegram already told us are too small for a report get a flag: the list shows no «Разобрать» for them. */
async function markSmall<T extends { dialogs: DialogDto[] }>(userId: string, result: T): Promise<T> {
  const small = await readSmallChats(userId).catch(() => new Set<string>())
  if (!small.size) return result
  return {
    ...result,
    dialogs: result.dialogs.map((dialog) => (small.has(dialog.id) ? { ...dialog, tooSmall: true } : dialog)),
  }
}

export const parseRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  app.get('/dialogs', async (request): Promise<DialogsResponse> => {
    const userId = userIdOf(request)
    try {
      const result = await withUserTelegram(userId, (api) => api.listDialogs())
      await cacheDialogs(userId, result)
      return { ...(await markSmall(userId, result)), stale: false }
    } catch (error) {
      // While an analysis holds the Telegram session, serve the last known list.
      const cached =
        error instanceof ApiError && error.code === 'TELEGRAM_BUSY' ? await readCachedDialogs(userId) : null
      if (cached) return { ...(await markSmall(userId, cached)), stale: true }
      throw error
    }
  })

  app.get('/recent', async (request): Promise<RecentActivityResponse> => {
    const userId = userIdOf(request)
    const cached = await readCachedRecentActivity(userId)
    if (cached && Date.now() - cached.computedAt < RECENT_FRESH_MS) return { ...cached.activity, stale: false }

    const since = new Date(Date.now() - RECENT_DAYS * DAY_MS)
    try {
      const activity = await withUserTelegram(
        userId,
        async (api) => {
          const { dialogs } = await api.listDialogs()
          const active = dialogs
            .filter(
              (dialog) => dialog.type === 'private' && dialog.lastMessageAt && new Date(dialog.lastMessageAt) >= since,
            )
            .sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''))
          const small = await readSmallChats(userId).catch(() => new Set<string>())
          const chats = []
          let asked = 0
          for (const dialog of active) {
            if (chats.length >= RECENT_CHAT_LIMIT || asked >= RECENT_SCAN_LIMIT) break
            if (small.has(dialog.id)) continue
            asked += 1
            const counts = await api.countRecent(dialog.id, since).catch(() => null)
            if (!counts) continue
            await rememberChatSize(userId, dialog.id, counts.total, MIN_REPORT_MESSAGES).catch(() => undefined)
            // A chat too small for a report is no suggestion; its size is remembered for the next time.
            if (counts.messages && counts.total >= MIN_REPORT_MESSAGES) chats.push({ ...dialog, ...counts })
          }
          chats.sort((a, b) => b.messages - a.messages)
          return {
            since: since.toISOString(),
            days: RECENT_DAYS,
            activeChats: active.length,
            chats: chats.map(({ id, title, hasAvatar, lastMessageAt, messages, mine, total }) => ({
              id,
              title,
              hasAvatar,
              lastMessageAt,
              messages,
              mine,
              total,
            })),
          }
        },
        { waitMs: 3_000 },
      )
      await cacheRecentActivity(userId, activity)
      return { ...activity, stale: false }
    } catch (error) {
      // While an analysis holds the Telegram session, serve the last known summary.
      if (cached && error instanceof ApiError && error.code === 'TELEGRAM_BUSY')
        return { ...cached.activity, stale: true }
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
    const { jobId } = parse(parseStatusQuerySchema, request.query)
    const jobs = await listUserActiveJobs(userId)
    // A suspended phone can miss the final socket frame, even as the next job starts.
    // Let it recover the result of the job it was following from durable storage.
    const tracked = jobId ? await findJob(jobId) : null
    if (tracked?.userId === userId && !['pending', 'running'].includes(tracked.status)) {
      const result = toJobDto(tracked)
      return {
        ...idleProgress(),
        jobId: result.jobId,
        status: result.status,
        chatId: result.chatId,
        chatTitle: result.chatTitle,
        scannedMessages: result.totalMessages,
        totalMessages: result.totalMessages,
        startedAt: tracked.startedAt?.getTime() ?? null,
        error: result.error,
        queued: jobs
          .filter((item) => item.chatId !== null)
          .map((item) => ({
            jobId: item.id,
            chatId: String(item.chatId),
            chatTitle: item.chatTitle,
          })),
      }
    }
    const job = jobs.find((item) => item.status === 'running') ?? jobs[0]
    if (!job) return { ...idleProgress(), queued: [] }

    const queued = jobs
      .filter((item) => item.id !== job.id && item.chatId !== null)
      .map((item) => ({ jobId: item.id, chatId: String(item.chatId), chatTitle: item.chatTitle }))
    const snapshot = await readProgress(userId)
    if (snapshot?.jobId === job.id) return { ...snapshot, queued }
    return {
      ...idleProgress(),
      jobId: job.id,
      status: job.status,
      phase: job.status === 'pending' ? 'queued' : 'connecting',
      chatId: job.chatId === null ? null : String(job.chatId),
      chatTitle: job.chatTitle,
      startedAt: (job.startedAt ?? job.createdAt).getTime(),
      queued,
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

    // Checked before the quota is spent; the worker checks again in case Telegram was busy here.
    const total = await countChatMessages(userId, chatId)
    if (total !== null && total < MIN_REPORT_MESSAGES)
      throw new ApiError(422, 'CHAT_TOO_SMALL', `The chat has ${total} messages; a report needs ${MIN_REPORT_MESSAGES}`)

    const { job, first } = await admitAnalysis(
      { userId, chatId, chatTitle: dialog?.title ?? null },
      { daily: config.FREE_ANALYSES_PER_DAY, queued: MAX_QUEUED_ANALYSES },
    )

    try {
      // Only the first job of an empty queue changes what the progress card shows.
      if (first)
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
    const { jobId } = parse(cancelParseBodySchema, request.body)
    const job = await cancelActiveJob(userId, jobId)
    if (!job) throw notFound('PARSE_NOT_ACTIVE', 'No active analysis')

    // A running job notices the cancellation on its next page and stops.
    await removeQueuedAnalysis(job.id)
    // Cancelling a waiting job leaves the running one's progress alone.
    if (job.startedAt)
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

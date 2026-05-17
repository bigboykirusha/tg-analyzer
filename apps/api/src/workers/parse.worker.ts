import { Worker, type Job } from 'bullmq'
import { parseDialogsQueue, type ParseJobData } from '../queues/parse.queue'
import { redis } from '../services/redis.service'
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
  type TelegramMessageLike,
} from '../services/telegram.service'
import {
  activateFullParseCooldown,
  clearActiveJob,
  clearCancelledJob,
  deactivateTelegramSessions,
  getActiveSessionForUser,
  isCancelledJob,
  publishParseProgress,
  setChatCooldown,
  updateParseJob,
} from '../services/session.service'
import {
  aggregateMessage,
  createChatAccumulator,
  projectTelegramMessageMetadata,
  saveAggregates,
} from '../services/stats.service'
import { sleep } from '../utils/sleep'

const SCAN_PROGRESS_INTERVAL_MS = 1500
const CHAT_REPARSE_COOLDOWN_SECONDS = 60 * 60

async function ensureNotCancelled(userId: string, jobId: string) {
  const cancelled = await isCancelledJob(userId, jobId)
  if (cancelled) {
    throw new ParseJobCancelledError()
  }
}

class ParseJobCancelledError extends Error {
  constructor() {
    super('Parse job cancelled')
    this.name = 'ParseJobCancelledError'
  }
}

type TelegramClientLike = {
  getDialogs(options: { limit: number }): Promise<TelegramDialog[]>
  getMessages(entity: unknown, options: { limit: number; offsetId: number }): Promise<TelegramMessageLike[]>
}

async function parseDialog(userId: string, session: {
  sessionString: string
  sessionIv: string
  authTag: string
}, jobId: string, dialog: TelegramDialog, context: {
  chatIndex: number
  totalChats: number
  job: Job<ParseJobData>
  startTime: number
}) {
  const accumulator = createChatAccumulator()
  let offsetId = 0
  let hasMore = true
  let scannedMessages = 0
  const chatName = dialog.title ?? dialog.name ?? 'Unknown'

  while (hasMore) {
    await ensureNotCancelled(userId, jobId)

    const messages = await withTelegramReconnectRetry(async () => {
      const client = await telegramPool.connectAuthorizedClient(userId, session) as unknown as TelegramClientLike
      return await withFloodWaitRetry(() => client.getMessages(dialog.entity, {
        limit: 100,
        offsetId,
      }))
    }, async () => {
      await telegramPool.disconnectAuthorizedClient(userId)
    })

    if (!messages || messages.length === 0) {
      break
    }

    if (messages.length < 100) {
      hasMore = false
    }

    offsetId = messages[messages.length - 1]?.id ?? offsetId
    for (const message of messages) {
      await ensureNotCancelled(userId, jobId)
      // We intentionally keep only cheap message metadata and counters.
      // No media files are downloaded or persisted during parsing.
      aggregateMessage(projectTelegramMessageMetadata(message), accumulator)
    }
    scannedMessages += messages.length

    await context.job.updateProgress({
      chatId: String(dialog.id),
      scannedMessages,
    })
    await publishParseProgress(userId, {
      type: 'progress',
      current: context.chatIndex,
      total: context.totalChats,
      chatId: String(dialog.id),
      chatName,
      status: 'running',
      message: `Scanning ${scannedMessages.toLocaleString('en-US')} messages`,
      scannedMessages,
      startTime: context.startTime,
    })

    await sleep(SCAN_PROGRESS_INTERVAL_MS)
  }

  await saveAggregates({
    userId,
    chat: {
      id: Number(dialog.id),
      title: dialog.title ?? dialog.name ?? null,
      type: normalizeTelegramDialogType(dialog),
    },
    stats: accumulator,
  })

  return accumulator.totalMessages
}

export const parseWorker = new Worker<ParseJobData>('parse-dialogs', async (job: Job<ParseJobData>) => {
  const { userId, jobId, chatIds } = job.data
  const startTime = Date.now()
  try {
    await ensureNotCancelled(userId, jobId)

    await publishParseProgress(userId, {
      type: 'progress',
      current: 0,
      total: chatIds?.length ?? 0,
      chatId: chatIds?.length === 1 ? chatIds[0] : null,
      chatName: '',
      status: 'pending',
      message: 'Connecting to Telegram',
      startTime,
    })

    const session = await getActiveSessionForUser(userId)
    if (!session) {
      throw new Error('Active Telegram session not found')
    }

    await publishParseProgress(userId, {
      type: 'progress',
      current: 0,
      total: chatIds?.length ?? 0,
      chatId: chatIds?.length === 1 ? chatIds[0] : null,
      chatName: '',
      status: 'running',
      message: 'Loading chat list',
      startTime,
    })

    const dialogs = await withTelegramReconnectRetry(async () => {
      const client = await telegramPool.connectAuthorizedClient(userId, session) as unknown as TelegramClientLike
      return await withFloodWaitRetry(() => client.getDialogs({ limit: 500 }))
    }, async () => {
      await telegramPool.disconnectAuthorizedClient(userId)
    })
    const targetDialogs = chatIds?.length
      ? dialogs.filter((dialog) => chatIds.includes(String(dialog.id)) && !isSystemTelegramDialog(dialog))
      : dialogs.filter((dialog) => !isSystemTelegramDialog(dialog))

    await updateParseJob(jobId, {
      status: 'running',
      totalChats: targetDialogs.length,
      parsedChats: 0,
      totalMessages: 0,
    })

    await publishParseProgress(userId, {
      type: 'progress',
      current: 0,
      total: targetDialogs.length,
      chatId: targetDialogs.length === 1 ? String(targetDialogs[0]?.id) : null,
      chatName: '',
      status: 'running',
      message: targetDialogs.length ? 'Starting message scan' : 'No matching chats found',
      startTime,
    })

    let totalMessages = 0
    for (let index = 0; index < targetDialogs.length; index += 1) {
      await ensureNotCancelled(userId, jobId)

      const dialog = targetDialogs[index]
      await publishParseProgress(userId, {
        type: 'progress',
        current: index + 1,
        total: targetDialogs.length,
        chatId: String(dialog.id),
        chatName: dialog.title ?? dialog.name ?? 'Unknown',
        status: 'running',
        message: `Parsing chat ${index + 1} of ${targetDialogs.length}`,
        startTime,
      })

      const count = await parseDialog(userId, session, jobId, dialog, {
        chatIndex: index + 1,
        totalChats: targetDialogs.length,
        job,
        startTime,
      })
      totalMessages += count

      await updateParseJob(jobId, {
        parsedChats: index + 1,
        totalMessages,
      })

      await sleep(500)
    }

    await updateParseJob(jobId, {
      status: 'completed',
      totalMessages,
      completedAt: new Date(),
    })
    if (chatIds?.length === 1) {
      await setChatCooldown(userId, chatIds[0], CHAT_REPARSE_COOLDOWN_SECONDS)
    } else if (!chatIds?.length) {
      await activateFullParseCooldown(userId)
    }
    await publishParseProgress(userId, {
      type: 'completed',
      chatId: targetDialogs.length === 1 ? String(targetDialogs[0]?.id) : null,
      status: 'completed',
      totalMessages,
      message: `Completed. Parsed ${targetDialogs.length} chat${targetDialogs.length === 1 ? '' : 's'}`,
    })
    await clearActiveJob(userId)
    await clearCancelledJob(userId, jobId)
  } catch (error) {
    if (isTelegramSessionExpiredError(error)) {
      job.discard()
    }
    throw error
  } finally {
    await telegramPool.disconnectAuthorizedClient(userId)
  }
}, {
  connection: redis,
  concurrency: 2,
  lockDuration: 10 * 60 * 1000,
  stalledInterval: 2 * 60 * 1000,
  maxStalledCount: 3,
  limiter: {
    max: 5,
    duration: 1000,
  },
})

parseWorker.on('failed', async (job, error) => {
  if (!job) {
    return
  }

  if (error instanceof ParseJobCancelledError) {
    await updateParseJob(job.data.jobId, {
      status: 'cancelled',
      completedAt: new Date(),
    })
    await publishParseProgress(job.data.userId, {
      type: 'cancelled',
      chatId: job.data.chatIds?.length === 1 ? job.data.chatIds[0] : null,
      status: 'cancelled',
      message: 'Parse cancelled',
    })
    await clearActiveJob(job.data.userId)
    await clearCancelledJob(job.data.userId, job.data.jobId)
    return
  }

  if (isTelegramSessionExpiredError(error)) {
    await deactivateTelegramSessions(job.data.userId)
    await telegramPool.disconnectAuthorizedClient(job.data.userId)
  }

  const errorMessage = error instanceof Error ? error.message : String(error)
  const isTransientTelegramConflict = isTelegramSessionDuplicatedError(error) || isTelegramSessionBusyError(error)

  await updateParseJob(job.data.jobId, {
    status: 'failed',
    errorMessage: isTelegramSessionExpiredError(error)
      ? 'Telegram session expired'
      : isTransientTelegramConflict
        ? null
        : errorMessage,
    completedAt: new Date(),
  })
  await publishParseProgress(job.data.userId, {
    type: 'failed',
    chatId: job.data.chatIds?.length === 1 ? job.data.chatIds[0] : null,
    status: 'failed',
    message: errorMessage,
  })
  await clearActiveJob(job.data.userId)
  await clearCancelledJob(job.data.userId, job.data.jobId)
})

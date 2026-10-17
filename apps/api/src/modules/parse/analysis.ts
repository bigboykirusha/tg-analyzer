import {
  ANALYZABLE_CHAT_TYPES,
  ChatReportBuilder,
  type ParseErrorCode,
  type ParseProgressDto,
} from '@tg-analyzer/shared'
import { DelayedError, UnrecoverableError, type Job } from 'bullmq'
import { logger } from '../../lib/logger'
import { sleep } from '../../lib/time'
import {
  telegram,
  TelegramBusyError,
  TelegramFloodWaitError,
  TelegramSessionRevokedError,
  type TelegramAccountApi,
  type TelegramDialog,
} from '../../telegram'
import { deactivateTelegramSession, getTelegramSession } from '../account/telegram-sessions'
import { findUser } from '../account/users'
import { saveReportAndCompleteJob } from '../reports/repository'
import { failJob, isJobActive, markJobRunning, setJobChatTitle } from './jobs'
import type { AnalysisJobData } from './queue'
import { idleProgress, publishProgress, startCooldown } from './state'

const PROGRESS_INTERVAL_MS = 1_000
const CANCELLATION_CHECK_INTERVAL_MS = 2_000
/** Longest single flood wait we sit through before giving up on the attempt. */
const MAX_FLOOD_WAIT_SECONDS = 15 * 60
/** Saving is retried on its own so a transient database error never rescans the chat. */
const SAVE_ATTEMPTS = 4
const SAVE_RETRY_DELAY_MS = 2_000

class AnalysisStoppedError extends Error {
  constructor() {
    super('Analysis was cancelled or deleted')
    this.name = 'AnalysisStoppedError'
  }
}

class AnalysisFailedError extends UnrecoverableError {
  constructor(readonly code: ParseErrorCode) {
    super(`Analysis failed: ${code}`)
    this.name = 'AnalysisFailedError'
  }
}

/**
 * Processes one analysis job: streams the chat history page by page into a
 * {@link ChatReportBuilder}, then stores the report and completes the job in
 * one transaction. Message text never leaves process memory.
 */
/** How long a queued analysis waits before checking again whether its turn has come. */
const QUEUE_RECHECK_MS = 5_000

export async function runAnalysis(job: Job<AnalysisJobData>, token?: string) {
  const { userId, jobId } = job.data
  const row = await markJobRunning(jobId)
  if (row === 'busy') {
    // One analysis per user at a time: park this job and try again shortly.
    if (!token) throw new Error('A queued analysis needs a worker token to wait')
    await job.moveToDelayed(Date.now() + QUEUE_RECHECK_MS, token)
    throw new DelayedError()
  }
  if (!row || row.chatId === null) return // cancelled or deleted before it started

  const chatId = String(row.chatId)
  const progress: ParseProgressDto = {
    ...idleProgress(),
    jobId,
    status: 'running',
    phase: job.attemptsMade > 0 ? 'retrying' : 'connecting',
    chatId,
    chatTitle: row.chatTitle,
    startedAt: (row.startedAt ?? new Date()).getTime(),
  }
  let lastPublishedAt = 0
  const publish = async (force = false) => {
    if (!force && Date.now() - lastPublishedAt < PROGRESS_INTERVAL_MS) return
    lastPublishedAt = Date.now()
    await publishProgress(userId, progress)
  }

  let lastCancellationCheckAt = Date.now()
  const ensureActive = async (force = false) => {
    if (!force && Date.now() - lastCancellationCheckAt < CANCELLATION_CHECK_INTERVAL_MS) return
    lastCancellationCheckAt = Date.now()
    if (!(await isJobActive(jobId))) throw new AnalysisStoppedError()
  }

  try {
    await publish(true)

    const session = await getTelegramSession(userId)
    if (!session) throw new AnalysisFailedError('telegram_session_expired')
    const user = await findUser(userId)
    if (!user) throw new AnalysisStoppedError()

    // The worker waits for API requests (avatars, dialog lists) to release the session.
    const result = await telegram.withSession(
      userId,
      session,
      (api) => scanChat(api, chatId, user.timezone, progress, publish, ensureActive),
      { waitMs: 60_000 },
    )

    progress.phase = 'saving'
    await publish(true)
    const report = result.builder.finish(result.dialog.type)
    const saved = await withRetries(async () => {
      await setJobChatTitle(jobId, result.dialog.title)
      return saveReportAndCompleteJob({
        userId,
        jobId,
        chatId,
        title: result.dialog.title,
        chatType: result.dialog.type,
        report,
      })
    })
    if (!saved) throw new AnalysisStoppedError()
  } catch (error) {
    await handleFailure(job, error, progress)
    return
  }

  // The report is committed: nothing below may turn the job into a failure or a retry.
  try {
    await startCooldown(userId, chatId)
    await publishProgress(userId, { ...progress, status: 'completed', phase: null })
  } catch (error) {
    logger.warn({ err: error, jobId }, 'analysis completed, but announcing it failed')
  }
  logger.info({ jobId, messages: progress.scannedMessages }, 'analysis completed')
}

async function withRetries<T>(work: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await work()
    } catch (error) {
      if (attempt >= SAVE_ATTEMPTS) throw error
      logger.warn({ err: error, attempt }, 'saving the report failed, retrying')
      await sleep(SAVE_RETRY_DELAY_MS * attempt)
    }
  }
}

async function scanChat(
  api: TelegramAccountApi,
  chatId: string,
  timeZone: string,
  progress: ParseProgressDto,
  publish: (force?: boolean) => Promise<void>,
  ensureActive: (force?: boolean) => Promise<void>,
): Promise<{ dialog: TelegramDialog; builder: ChatReportBuilder }> {
  const dialog = await api.getDialog(chatId)
  if (!dialog || !(ANALYZABLE_CHAT_TYPES as readonly string[]).includes(dialog.type)) {
    throw new AnalysisFailedError('chat_unavailable')
  }

  progress.chatTitle = dialog.title
  progress.phase = 'scanning'
  await publish(true)

  const builder = new ChatReportBuilder(timeZone)
  let offsetId: number | null = 0
  while (offsetId !== null) {
    await ensureActive()
    let page
    try {
      page = await api.getHistory(chatId, offsetId)
    } catch (error) {
      if (!(error instanceof TelegramFloodWaitError) || error.seconds > MAX_FLOOD_WAIT_SECONDS) throw error
      await waitOutFloodControl(error.seconds, progress, publish, ensureActive)
      continue
    }

    for (const message of page.messages) builder.add(message)
    progress.scannedMessages = builder.messageCount
    progress.totalMessages = page.total ?? progress.totalMessages
    offsetId = page.nextOffsetId
    await publish()
  }

  await ensureActive(true)
  return { dialog, builder }
}

async function waitOutFloodControl(
  seconds: number,
  progress: ParseProgressDto,
  publish: (force?: boolean) => Promise<void>,
  ensureActive: (force?: boolean) => Promise<void>,
) {
  progress.phase = 'waiting'
  const until = Date.now() + (seconds + 1) * 1000
  while (Date.now() < until) {
    progress.waitSeconds = Math.ceil((until - Date.now()) / 1000)
    await publish(true)
    await ensureActive(true)
    await sleep(Math.min(5_000, until - Date.now()))
  }
  progress.phase = 'scanning'
  progress.waitSeconds = null
}

/**
 * A missing table or column means the database was not migrated. Retrying
 * cannot help and would read the whole chat again, so such errors fail at once.
 */
function isSchemaError(error: unknown) {
  const codeOf = (value: unknown) => (value as { code?: unknown } | null)?.code
  const code = codeOf(error) ?? codeOf((error as { cause?: unknown } | null)?.cause)
  return code === '42P01' || code === '42703' || code === '42704'
}

function failureCode(error: unknown): ParseErrorCode {
  if (error instanceof AnalysisFailedError) return error.code
  if (error instanceof TelegramSessionRevokedError) return 'telegram_session_expired'
  if (error instanceof TelegramBusyError || error instanceof TelegramFloodWaitError) return 'telegram_busy'
  return 'internal'
}

async function handleFailure(job: Job<AnalysisJobData>, error: unknown, progress: ParseProgressDto) {
  const { userId, jobId } = job.data

  // Cancellation is published by the API; nothing else to do.
  if (error instanceof AnalysisStoppedError) return

  const code = failureCode(error)
  if (code === 'telegram_session_expired') await deactivateTelegramSession(userId)

  const retryable = (code === 'telegram_busy' || code === 'internal') && !isSchemaError(error)
  const attemptsLeft = job.attemptsMade + 1 < (job.opts.attempts ?? 1)
  if (retryable && attemptsLeft) {
    logger.warn({ err: error, jobId, attempt: job.attemptsMade + 1 }, 'analysis attempt failed, retrying')
    await publishProgress(userId, { ...progress, status: 'pending', phase: 'retrying', waitSeconds: null })
    throw error
  }

  logger.error({ err: error, jobId, code }, 'analysis failed')
  await failJob(jobId, code)
  await publishProgress(userId, { ...progress, status: 'failed', phase: null, waitSeconds: null, error: code })
  // Mark the BullMQ job as failed without further retries.
  throw new UnrecoverableError(code)
}

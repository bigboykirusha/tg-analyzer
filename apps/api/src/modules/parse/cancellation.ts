import type { ParseJobRow } from '../../db/schema'
import { logger } from '../../lib/logger'
import { removeQueuedAnalysis } from './queue'
import { idleProgress, publishCancellation } from './state'

/** PostgreSQL has already cancelled the job. Reconcile its queue and live progress independently. */
export async function announceCancellation(job: ParseJobRow) {
  const results = await Promise.allSettled([
    removeQueuedAnalysis(job.id),
    publishCancellation(job.userId, {
      ...idleProgress(),
      jobId: job.id,
      status: 'cancelled',
      chatId: job.chatId === null ? null : String(job.chatId),
      chatTitle: job.chatTitle,
    }),
  ])
  for (const result of results) {
    if (result.status === 'rejected')
      logger.warn({ err: result.reason, jobId: job.id }, 'could not announce analysis cancellation')
  }
}

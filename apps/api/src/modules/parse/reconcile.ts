import { logger } from '../../lib/logger'
import { DAY_MS } from '../../lib/time'
import { failJob, listActiveJobs } from './jobs'
import { analysisQueue, enqueueAnalysis } from './queue'
import { idleProgress, publishProgress } from './state'

/**
 * PostgreSQL is the source of truth for jobs. After a Redis outage or a worker
 * crash, active jobs without a live queue entry are re-queued, or failed when stale.
 */
export async function reconcileActiveJobs() {
  for (const job of await listActiveJobs()) {
    const queued = await analysisQueue().getJob(job.id)
    const state = queued ? await queued.getState() : 'missing'
    if (!['missing', 'completed', 'failed', 'unknown'].includes(state)) continue

    if (Date.now() - job.createdAt.getTime() > DAY_MS) {
      await failJob(job.id, 'interrupted')
      await publishProgress(job.userId, { ...idleProgress(), jobId: job.id, status: 'failed', error: 'interrupted' })
      logger.warn({ jobId: job.id }, 'stale analysis job marked as interrupted')
      continue
    }

    await queued?.remove().catch(() => undefined)
    await enqueueAnalysis({ userId: job.userId, jobId: job.id })
    logger.info({ jobId: job.id, previousState: state }, 'analysis job re-queued')
  }
}

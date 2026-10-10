import { parseDialogsQueue, type ParseJobData } from '../queues/parse.queue'
import {
  attachBullJobId,
  clearActiveJob,
  isCancelledJob,
  listUnfinishedParseJobs,
  markActiveJob,
  updateParseJob,
} from './session.service'
import { logger } from './logger.service'

export async function reconcileParseJobs() {
  const jobs = await listUnfinishedParseJobs()
  let enqueued = 0
  let cancelled = 0
  let failed = 0

  for (const job of jobs) {
    if (await isCancelledJob(job.userId, job.id)) {
      await updateParseJob(job.id, { status: 'cancelled', completedAt: new Date() })
      await clearActiveJob(job.userId)
      cancelled += 1
      continue
    }

    const bullJob = await parseDialogsQueue.getJob(job.id)
    if (!bullJob) {
      const data: ParseJobData = {
        userId: job.userId,
        jobId: job.id,
        chatIds: job.requestedChatIds,
      }
      await parseDialogsQueue.add('parse-dialogs', data, { jobId: job.id })
      await attachBullJobId(job.id, job.id)
      await markActiveJob(job.userId, job.id)
      enqueued += 1
      logger.info({ event: 'parse_job_reconciled', jobId: job.id }, 'restored missing parse job')
      continue
    }

    const state = await bullJob.getState()
    if (state === 'completed' || state === 'failed' || state === 'unknown') {
      await updateParseJob(job.id, {
        status: 'failed',
        errorMessage: 'Job reached a terminal queue state before persistence completed',
        completedAt: new Date(),
      })
      await clearActiveJob(job.userId)
      failed += 1
      continue
    }

    await markActiveJob(job.userId, job.id)
  }

  return { enqueued, cancelled, failed }
}

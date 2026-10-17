import { Queue } from 'bullmq'
import { createRedisConnection } from '../../lib/redis'

export const ANALYSIS_QUEUE = 'chat-analysis'

export interface AnalysisJobData {
  userId: string
  jobId: string
}

let queue: Queue<AnalysisJobData> | null = null
let connection: ReturnType<typeof createRedisConnection> | null = null

/** Lazily created so that importing this module does not open a Redis connection. */
export function analysisQueue() {
  queue ??= new Queue<AnalysisJobData>(ANALYSIS_QUEUE, {
    connection: (connection = createRedisConnection()),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 15_000 },
      removeOnComplete: 100,
      removeOnFail: 100,
    },
  })
  return queue
}

/** The BullMQ job id equals the parse job id, so enqueueing twice is a no-op. */
export async function enqueueAnalysis(data: AnalysisJobData) {
  await analysisQueue().add('analyze-chat', data, { jobId: data.jobId })
}

/** Removes a job that has not started yet. Active jobs stop on their own after cancellation. */
export async function removeQueuedAnalysis(jobId: string) {
  const job = await analysisQueue().getJob(jobId)
  if (!job) return
  const state = await job.getState()
  if (state === 'waiting' || state === 'delayed' || state === 'prioritized' || state === 'waiting-children') {
    await job.remove().catch(() => undefined)
  }
}

export async function closeAnalysisQueue() {
  await queue?.close()
  // BullMQ leaves connections it did not create open.
  await connection?.quit().catch(() => undefined)
  queue = null
  connection = null
}

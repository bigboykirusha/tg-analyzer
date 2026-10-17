import { Queue } from 'bullmq'
import { createRedisConnection } from '../../lib/redis'

export const PEOPLE_QUEUE = 'people-overview'

export interface PeopleJobData {
  userId: string
}

let queue: Queue<PeopleJobData> | null = null
let connection: ReturnType<typeof createRedisConnection> | null = null

/** Lazily created so that importing this module does not open a Redis connection. */
export function peopleQueue() {
  queue ??= new Queue<PeopleJobData>(PEOPLE_QUEUE, {
    connection: (connection = createRedisConnection()),
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 30_000 },
      // Finished jobs are removed so the per-user job id can be reused for the next run.
      removeOnComplete: true,
      removeOnFail: true,
    },
  })
  return queue
}

/** One overview per user at a time: the job id is derived from the user id. */
export async function enqueuePeopleOverview(userId: string) {
  await peopleQueue().add('people-overview', { userId }, { jobId: `people-${userId}` })
}

export async function closePeopleQueue() {
  await queue?.close()
  await connection?.quit().catch(() => undefined)
  queue = null
  connection = null
}

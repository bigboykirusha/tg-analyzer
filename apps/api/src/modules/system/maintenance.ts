import { Queue, Worker } from 'bullmq'
import { config } from '../../config'
import { logger } from '../../lib/logger'
import { createRedisConnection } from '../../lib/redis'
import { addMs, DAY_MS } from '../../lib/time'
import { deleteExpiredRefreshSessions } from '../auth/refresh-sessions'
import { deleteJobsOlderThan } from '../parse/jobs'

const MAINTENANCE_QUEUE = 'maintenance'

async function runMaintenance() {
  await deleteExpiredRefreshSessions()
  await deleteJobsOlderThan(addMs(new Date(), -config.DATA_RETENTION_DAYS * DAY_MS))
}

/** Schedules the nightly cleanup and returns the worker that executes it. */
export async function startMaintenance() {
  const queueConnection = createRedisConnection()
  const queue = new Queue(MAINTENANCE_QUEUE, { connection: queueConnection })
  await queue.upsertJobScheduler('nightly-cleanup', { pattern: '0 4 * * *' }, { name: 'cleanup' })
  await queue.close()
  await queueConnection.quit()

  const workerConnection = createRedisConnection()
  const worker = new Worker(MAINTENANCE_QUEUE, runMaintenance, { connection: workerConnection })
  worker.on('failed', (_job, error) => logger.error({ err: error }, 'maintenance failed'))
  return {
    async close() {
      await worker.close()
      await workerConnection.quit().catch(() => undefined)
    },
  }
}

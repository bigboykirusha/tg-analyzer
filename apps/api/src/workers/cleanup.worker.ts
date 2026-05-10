import { Worker } from 'bullmq'
import { lt } from 'drizzle-orm'
import { cleanupQueue } from '../queues/parse.queue'
import { redis } from '../services/redis.service'
import { config } from '../config'
import { addDays } from '../utils/date'
import { db, schema } from '../db'
import { cleanupExpiredRefreshSessions } from '../services/session.service'

export const cleanupWorker = new Worker('cleanup-old-data', async () => {
  await cleanupExpiredRefreshSessions()
  const threshold = addDays(new Date(), -config.DATA_RETENTION_DAYS)
  await db.delete(schema.parseJobs).where(lt(schema.parseJobs.createdAt, threshold))
}, {
  connection: redis,
})

export async function scheduleCleanupJob() {
  const existing = await cleanupQueue.getRepeatableJobs()
  if (!existing.find((job) => job.name === 'cleanup')) {
    await cleanupQueue.add('cleanup', {}, {
      repeat: { pattern: '0 4 * * *' },
      removeOnComplete: true,
      removeOnFail: 10,
    })
  }
}

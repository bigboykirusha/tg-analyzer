import { eq, sql } from 'drizzle-orm'
import { db, schema } from '../db'
import { cleanupQueue, parseDialogsQueue } from '../queues/parse.queue'
import { redis } from './redis.service'
import { telegramPool } from './telegram.service'
import { logger } from './logger.service'

export async function purgeDeletedUser(userId: string) {
  if (await db.query.users.findFirst({ where: eq(schema.users.id, userId) })) {
    throw new Error('Deletion not committed yet')
  }

  await telegramPool.clearUserCache(userId)
  const jobs = await parseDialogsQueue.getJobs(['wait', 'active', 'delayed', 'completed', 'failed', 'paused'])
  let processing = false
  for (const job of jobs) {
    if (job.data.userId !== userId) {
      continue
    }

    try {
      await job.remove()
    } catch {
      processing = true
    }
  }

  let cursor = '0'
  do {
    const result = await redis.scan(cursor, 'MATCH', `*:${userId}*`, 'COUNT', 100)
    cursor = result[0]
    const keys = result[1].filter((key) => {
      if (!/^(parse:|telegram:client:)/.test(key)) {
        return false
      }

      return !processing || !key.startsWith('parse:cancelled:')
    })
    if (keys.length) {
      await redis.del(...keys)
    }
  } while (cursor !== '0')

  if (processing) {
    throw new Error('Waiting for active analysis to stop')
  }
}

export async function deleteAccount(userId: string) {
  const activeJobs = await db.query.parseJobs.findMany({ where: eq(schema.parseJobs.userId, userId) })
  await Promise.all(
    activeJobs
      .filter((job) => job.status === 'pending' || job.status === 'running')
      .map((job) => redis.set(`parse:cancelled:${userId}:${job.id}`, '1', 'EX', 24 * 60 * 60)),
  )

  // Schedule durable cleanup before deleting the owner. If deletion fails, the job retries safely.
  await cleanupQueue.add(
    'delete-user-data',
    { userId },
    {
      jobId: `delete-${userId}`,
      delay: 5000,
      attempts: 20,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
    },
  )
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`)
    await tx.delete(schema.users).where(eq(schema.users.id, userId))
  })
  await purgeDeletedUser(userId).catch((error) => {
    logger.warn({ err: error }, 'account removed; cache cleanup scheduled')
  })
}

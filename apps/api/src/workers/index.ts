import '../load-env'
import { parseWorker } from './parse.worker'
import { cleanupWorker, scheduleCleanupJob } from './cleanup.worker'
import { pool } from '../db'
import { redis } from '../services/redis.service'
import { clearWorkerHeartbeat, updateWorkerHeartbeat } from '../services/runtime-status.service'
import { logger } from '../services/logger.service'
import { reconcileParseJobs } from '../services/job-reconciliation.service'
import { telegramPool } from '../services/telegram.service'
import { cleanupQueue, parseDialogsQueue } from '../queues/parse.queue'

;(async () => {
  await scheduleCleanupJob()
  await reconcileParseJobs()
  await updateWorkerHeartbeat()

  const heartbeatInterval = setInterval(() => {
    void updateWorkerHeartbeat()
  }, 10_000)
  heartbeatInterval.unref?.()
  const reconciliationInterval = setInterval(() => {
    void reconcileParseJobs().catch((error) => {
      logger.error({ event: 'parse_reconciliation_failed', err: error }, 'parse reconciliation failed')
    })
  }, 30_000)
  reconciliationInterval.unref?.()

  let shuttingDown = false
  const handleShutdown = async () => {
    if (shuttingDown) return
    shuttingDown = true
    clearInterval(heartbeatInterval)
    clearInterval(reconciliationInterval)
    await Promise.allSettled([parseWorker.close(), cleanupWorker.close()])
    await telegramPool.close()
    await clearWorkerHeartbeat()
    await Promise.allSettled([parseDialogsQueue.close(), cleanupQueue.close()])
    await redis.quit()
    await pool.end()
    process.exit(0)
  }

  process.on('SIGINT', handleShutdown)
  process.on('SIGTERM', handleShutdown)
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'unhandled worker rejection')
    process.exit(1)
  })
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'uncaught worker exception')
    process.exit(1)
  })
})()

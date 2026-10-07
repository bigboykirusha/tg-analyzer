import '../load-env'
import { parseWorker } from './parse.worker'
import { cleanupWorker, scheduleCleanupJob } from './cleanup.worker'
import { pool } from '../db'
import { redis } from '../services/redis.service'
import { clearWorkerHeartbeat, updateWorkerHeartbeat } from '../services/runtime-status.service'
import { logger } from '../services/logger.service'

;(async () => {
  await scheduleCleanupJob()
  await updateWorkerHeartbeat()

  const heartbeatInterval = setInterval(() => {
    void updateWorkerHeartbeat()
  }, 10_000)
  heartbeatInterval.unref?.()

  const handleShutdown = async () => {
    clearInterval(heartbeatInterval)
    await Promise.allSettled([
      parseWorker.close(),
      cleanupWorker.close(),
      clearWorkerHeartbeat(),
      redis.quit(),
      pool.end(),
    ])
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

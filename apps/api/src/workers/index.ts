import '../load-env'
import { parseWorker } from './parse.worker'
import { cleanupWorker, scheduleCleanupJob } from './cleanup.worker'
import { pool } from '../db'
import { redis } from '../services/redis.service'
import { clearWorkerHeartbeat, updateWorkerHeartbeat } from '../services/runtime-status.service'

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
    // Keep worker crashes visible to the process manager without leaking job payloads.
    process.stderr.write(`Unhandled rejection in worker process: ${String(reason)}\n`)
    process.exit(1)
  })
  process.on('uncaughtException', (error) => {
    process.stderr.write(`Uncaught exception in worker process: ${error.message}\n`)
    process.exit(1)
  })
})()

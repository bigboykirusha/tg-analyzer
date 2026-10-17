import { Worker } from 'bullmq'
import { pool } from './db'
import { logger } from './lib/logger'
import { createRedisConnection, redis } from './lib/redis'
import { runAnalysis } from './modules/parse/analysis'
import { ANALYSIS_QUEUE, closeAnalysisQueue, type AnalysisJobData } from './modules/parse/queue'
import { reconcileActiveJobs } from './modules/parse/reconcile'
import { beatWorkerHeartbeat, clearWorkerHeartbeat } from './modules/system/heartbeat'
import { startMaintenance } from './modules/system/maintenance'
import { telegram } from './telegram'

const HEARTBEAT_INTERVAL_MS = 10_000
const RECONCILE_INTERVAL_MS = 60_000

async function main() {
  const workerConnection = createRedisConnection()
  const analysisWorker = new Worker<AnalysisJobData>(ANALYSIS_QUEUE, runAnalysis, {
    connection: workerConnection,
    concurrency: 4,
    // Long chats take minutes; the lock is renewed automatically while the job runs.
    lockDuration: 2 * 60 * 1000,
  })
  analysisWorker.on('error', (error) => logger.error({ err: error }, 'analysis worker error'))
  const maintenanceWorker = await startMaintenance()

  await reconcileActiveJobs()
  await beatWorkerHeartbeat()
  const heartbeat = setInterval(() => void beatWorkerHeartbeat().catch(() => undefined), HEARTBEAT_INTERVAL_MS)
  const reconcile = setInterval(
    () => void reconcileActiveJobs().catch((error) => logger.error({ err: error }, 'job reconciliation failed')),
    RECONCILE_INTERVAL_MS,
  )
  logger.info('worker started')

  let stopping = false
  const shutdown = async (signal: string) => {
    if (stopping) return
    stopping = true
    logger.info({ signal }, 'worker shutting down')
    clearInterval(heartbeat)
    clearInterval(reconcile)
    await Promise.allSettled([analysisWorker.close(), maintenanceWorker.close()])
    await workerConnection.quit().catch(() => undefined)
    await clearWorkerHeartbeat().catch(() => undefined)
    await Promise.allSettled([closeAnalysisQueue(), telegram.close()])
    await Promise.allSettled([redis.quit(), pool.end()])
    process.exit(0)
  }
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

// A stray rejection (GramJS fires some after a client disconnects) must not
// kill the worker: an exit mid-analysis makes BullMQ restart the job from scratch.
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'unhandled rejection')
})

main().catch((error) => {
  logger.fatal({ err: error }, 'worker failed to start')
  process.exit(1)
})

import '../load-env'
import { parseWorker } from './parse.worker'
import { cleanupWorker, scheduleCleanupJob } from './cleanup.worker'

await scheduleCleanupJob()

const handleShutdown = async () => {
  await Promise.allSettled([
    parseWorker.close(),
    cleanupWorker.close(),
  ])
  process.exit(0)
}

process.on('SIGINT', handleShutdown)
process.on('SIGTERM', handleShutdown)

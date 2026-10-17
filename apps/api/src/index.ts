import { config } from './config'
import { pool } from './db'
import { applyMigrations, assertSchema, shouldMigrateOnStart } from './db/migrations-runner'
import { buildServer } from './http/server'
import { logger } from './lib/logger'
import { redis } from './lib/redis'
import { closeAnalysisQueue } from './modules/parse/queue'
import { closePeopleQueue } from './modules/people/queue'
import { telegram } from './telegram'

async function main() {
  if (shouldMigrateOnStart()) await applyMigrations(config.DATABASE_URL)
  await assertSchema(pool)
  const app = await buildServer()

  let stopping = false
  const shutdown = async (signal: string) => {
    if (stopping) return
    stopping = true
    app.log.info({ signal }, 'api shutting down')
    await app.close()
    await Promise.allSettled([closeAnalysisQueue(), closePeopleQueue(), telegram.close()])
    await Promise.allSettled([redis.quit(), pool.end()])
    process.exit(0)
  }
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))

  await app.listen({ host: config.API_HOST, port: config.API_PORT })
}

process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'unhandled rejection')
  process.exit(1)
})

main().catch((error) => {
  logger.fatal({ err: error }, 'api failed to start')
  process.exit(1)
})

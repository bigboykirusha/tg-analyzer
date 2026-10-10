import './load-env'
import { telegramPool } from './services/telegram.service'
import { parseDialogsQueue, cleanupQueue } from './queues/parse.queue'
import { buildServer } from './server'
import { config } from './config'
import { redis } from './services/redis.service'
import { pool } from './db'
;(async () => {
  const server = await buildServer()

  const shutdown = async (signal: NodeJS.Signals) => {
    server.log.info({ signal }, 'shutting down')
    await server.close()
    await telegramPool.close()
    await Promise.allSettled([parseDialogsQueue.close(), cleanupQueue.close()])
    await Promise.allSettled([redis.quit(), pool.end()])
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  process.on('unhandledRejection', (reason) => {
    server.log.fatal({ err: reason }, 'unhandled rejection')
    process.exit(1)
  })
  process.on('uncaughtException', (error) => {
    server.log.fatal({ err: error }, 'uncaught exception')
    process.exit(1)
  })

  await server.listen({ host: config.API_HOST, port: config.API_PORT })
})()

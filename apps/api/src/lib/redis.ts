import { Redis, type RedisOptions } from 'ioredis'
import { config } from '../config'
import { logger } from './logger'

const options: RedisOptions = {
  // Required by BullMQ for blocking connections.
  maxRetriesPerRequest: null,
  retryStrategy: (attempt) => Math.min(attempt * 200, 5000),
}

/** ioredis reconnects on its own; connection errors only need to be logged, never thrown. */
function connect() {
  const connection = new Redis(config.REDIS_URL, options)
  connection.on('error', (error) => logger.warn({ err: error }, 'redis connection error'))
  return connection
}

export const redis = connect()

export function createRedisConnection() {
  return connect()
}

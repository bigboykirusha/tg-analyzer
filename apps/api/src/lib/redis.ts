import { Redis, type RedisOptions } from 'ioredis'
import { config } from '../config'

const options: RedisOptions = {
  // Required by BullMQ for blocking connections.
  maxRetriesPerRequest: null,
  retryStrategy: (attempt) => Math.min(attempt * 200, 5000),
}

export const redis = new Redis(config.REDIS_URL, options)

export function createRedisConnection() {
  return new Redis(config.REDIS_URL, options)
}

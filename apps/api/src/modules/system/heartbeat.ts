import { redis } from '../../lib/redis'

const KEY = 'runtime:worker:heartbeat'
const TTL_SECONDS = 30

export async function beatWorkerHeartbeat() {
  await redis.set(KEY, String(Date.now()), 'EX', TTL_SECONDS)
}

export async function clearWorkerHeartbeat() {
  await redis.del(KEY)
}

export async function isWorkerAlive() {
  return (await redis.exists(KEY)) === 1
}

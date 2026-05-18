import { redis } from './redis.service'

const WORKER_HEARTBEAT_KEY = 'runtime:worker:heartbeat'
const WORKER_HEARTBEAT_TTL_SECONDS = 30

export async function updateWorkerHeartbeat() {
  await redis.set(WORKER_HEARTBEAT_KEY, String(Date.now()), 'EX', WORKER_HEARTBEAT_TTL_SECONDS)
}

export async function clearWorkerHeartbeat() {
  await redis.del(WORKER_HEARTBEAT_KEY)
}

export async function hasRecentWorkerHeartbeat() {
  const heartbeat = await redis.get(WORKER_HEARTBEAT_KEY)
  if (!heartbeat) {
    return false
  }

  const timestamp = Number(heartbeat)
  if (!Number.isFinite(timestamp)) {
    return false
  }

  return Date.now() - timestamp <= WORKER_HEARTBEAT_TTL_SECONDS * 1000
}

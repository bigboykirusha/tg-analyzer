import { randomUUID } from 'node:crypto'
import type { Redis } from 'ioredis'
import { sleep } from '../lib/time'
import { TelegramBusyError } from './errors'

const LEASE_TTL_MS = 2 * 60 * 1000
const RENEW_EVERY_MS = 30 * 1000
const POLL_MS = 250

const RENEW_SCRIPT = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) end return 0`
const RELEASE_SCRIPT = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0`

export interface Lease {
  /** Aborted when the lease is lost, e.g. after a long Redis outage. */
  signal: AbortSignal
  release(): Promise<void>
}

/**
 * A Redis lock that guarantees only one process talks to Telegram with a given
 * authorization at a time (Telegram rejects concurrent use with AUTH_KEY_DUPLICATED).
 */
export async function acquireSessionLease(redis: Redis, userId: string, waitMs: number): Promise<Lease> {
  const key = `telegram:lease:${userId}`
  const token = randomUUID()
  const deadline = Date.now() + waitMs

  while ((await redis.set(key, token, 'PX', LEASE_TTL_MS, 'NX')) !== 'OK') {
    if (Date.now() >= deadline) throw new TelegramBusyError()
    await sleep(POLL_MS)
  }

  const controller = new AbortController()
  const renew = setInterval(() => {
    redis
      .eval(RENEW_SCRIPT, 1, key, token, String(LEASE_TTL_MS))
      .then((renewed) => {
        if (Number(renewed) !== 1) controller.abort(new TelegramBusyError('Telegram session lease was lost'))
      })
      .catch(() => undefined)
  }, RENEW_EVERY_MS)
  renew.unref()

  return {
    signal: controller.signal,
    async release() {
      clearInterval(renew)
      await redis.eval(RELEASE_SCRIPT, 1, key, token).catch(() => undefined)
    },
  }
}

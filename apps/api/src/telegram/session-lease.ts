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

  let leaseUntil: number
  while (true) {
    const requestedAt = Date.now()
    if ((await redis.set(key, token, 'PX', LEASE_TTL_MS, 'NX')) === 'OK') {
      leaseUntil = requestedAt + LEASE_TTL_MS
      break
    }
    if (Date.now() >= deadline) throw new TelegramBusyError()
    await sleep(POLL_MS)
  }

  const controller = new AbortController()
  let released = false
  const lost = () => {
    if (!released) controller.abort(new TelegramBusyError('Telegram session lease was lost'))
  }
  // Redis commands can remain pending throughout an outage. Stop locally before
  // the lease expires, even when the renewal promise never settles.
  let expiry = setTimeout(lost, Math.max(0, leaseUntil - Date.now()))
  expiry.unref()
  if (Date.now() >= leaseUntil) lost()
  const renew = setInterval(() => {
    if (controller.signal.aborted || released) return
    const requestedAt = Date.now()
    redis
      .eval(RENEW_SCRIPT, 1, key, token, String(LEASE_TTL_MS))
      .then((renewed) => {
        if (released) return
        if (Number(renewed) !== 1) return lost()
        if (controller.signal.aborted) return
        clearTimeout(expiry)
        expiry = setTimeout(lost, Math.max(0, requestedAt + LEASE_TTL_MS - Date.now()))
        expiry.unref()
      })
      .catch(lost)
  }, RENEW_EVERY_MS)
  renew.unref()

  return {
    signal: controller.signal,
    async release() {
      released = true
      clearInterval(renew)
      clearTimeout(expiry)
      await redis.eval(RELEASE_SCRIPT, 1, key, token).catch(() => undefined)
    },
  }
}

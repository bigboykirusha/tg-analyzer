import { sleep } from '../utils/sleep'

type LeaseStore = {
  eval(script: string, numberOfKeys: number, ...args: string[]): Promise<unknown>
}

const REFRESH_LEASE_SCRIPT = `
  if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('pexpire', KEYS[1], ARGV[2])
  end
  return 0
`

const RELEASE_LEASE_SCRIPT = `
  if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
  end
  return 0
`

export async function refreshOwnedLease(store: LeaseStore, key: string, token: string, ttlMs: number) {
  return Number(await store.eval(REFRESH_LEASE_SCRIPT, 1, key, token, String(ttlMs))) === 1
}

export async function releaseOwnedLease(store: LeaseStore, key: string, token: string) {
  return Number(await store.eval(RELEASE_LEASE_SCRIPT, 1, key, token)) === 1
}

export class TelegramLeaseLostError extends Error {
  constructor() {
    super('Telegram client lease was lost')
    this.name = 'TelegramLeaseLostError'
  }
}

export class TelegramSessionRevokedError extends Error {
  readonly cause: unknown

  constructor(cause: unknown) {
    super('Telegram session was revoked')
    this.name = 'TelegramSessionRevokedError'
    this.cause = cause
  }
}

export function getFloodWaitSeconds(error: unknown) {
  const value = error as { seconds?: unknown; errorMessage?: unknown; message?: unknown }
  if (typeof value.seconds === 'number' && Number.isFinite(value.seconds)) {
    return value.seconds
  }

  const message = String(value.errorMessage ?? value.message ?? '')
  const match = message.match(/FLOOD_WAIT_?(\d+)/i)
  return match ? Number(match[1]) : null
}

export function isTelegramSessionExpiredError(error: unknown) {
  if (error instanceof TelegramSessionRevokedError) return true
  const message = String(
    (error as { errorMessage?: unknown; message?: unknown })?.errorMessage ?? (error as Error)?.message ?? '',
  )
  return /AUTH_KEY_UNREGISTERED|SESSION_REVOKED|SESSION_EXPIRED|USER_DEACTIVATED|AUTH_KEY_INVALID/i.test(message)
}

export async function withFloodWaitRetry<T>(
  action: () => Promise<T>,
  maxAttempts = 2,
  options: { assertContinue?: () => void | Promise<void>; pollIntervalMs?: number } = {},
): Promise<T> {
  let attempt = 0
  while (attempt < maxAttempts) {
    try {
      return await action()
    } catch (error) {
      if (isTelegramSessionExpiredError(error)) {
        throw error instanceof TelegramSessionRevokedError ? error : new TelegramSessionRevokedError(error)
      }
      attempt += 1
      const seconds = getFloodWaitSeconds(error)
      if (!seconds || attempt >= maxAttempts) {
        throw error
      }
      let remainingMs = (seconds + 1) * 1000
      const pollIntervalMs = Math.max(10, options.pollIntervalMs ?? 250)
      while (remainingMs > 0) {
        await options.assertContinue?.()
        const waitMs = Math.min(remainingMs, pollIntervalMs)
        await sleep(waitMs)
        remainingMs -= waitMs
      }
    }
  }

  return action()
}

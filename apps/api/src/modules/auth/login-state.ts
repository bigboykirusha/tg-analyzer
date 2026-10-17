import { randomUUID } from 'node:crypto'
import { openJson, sealJson } from '../../lib/crypto'
import { redis } from '../../lib/redis'

/**
 * Telegram login spans several HTTP requests. The intermediate (not yet
 * authorised) Telegram session is kept encrypted in Redis for a few minutes.
 */

const LOGIN_TTL_SECONDS = 5 * 60

export interface PendingCode {
  phone: string
  phoneCodeHash: string
  session: string
  /** The code went to the login email; it is then verified differently. */
  viaEmail?: boolean
}

export interface PendingPassword {
  phone: string
  session: string
}

const codeKey = (phoneCodeHash: string) => `auth:login:code:${phoneCodeHash}`
const passwordKey = (token: string) => `auth:login:password:${token}`

async function read<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key)
  if (!raw) return null
  try {
    return openJson<T>(raw)
  } catch {
    await redis.del(key)
    return null
  }
}

export async function savePendingCode(state: PendingCode) {
  await redis.set(codeKey(state.phoneCodeHash), sealJson(state), 'EX', LOGIN_TTL_SECONDS)
}

export const readPendingCode = (phoneCodeHash: string) => read<PendingCode>(codeKey(phoneCodeHash))

export async function clearPendingCode(phoneCodeHash: string) {
  await redis.del(codeKey(phoneCodeHash))
}

/** Returns an opaque token the client presents with the 2FA password. */
export async function savePendingPassword(state: PendingPassword) {
  const token = randomUUID()
  await redis.set(passwordKey(token), sealJson(state), 'EX', LOGIN_TTL_SECONDS)
  return token
}

export const readPendingPassword = (token: string) => read<PendingPassword>(passwordKey(token))

export async function clearPendingPassword(token: string) {
  await redis.del(passwordKey(token))
}

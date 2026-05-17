import { Api, TelegramClient } from 'telegram'
import { computeCheck } from 'telegram/Password.js'
import { StringSession } from 'telegram/sessions/index.js'
import { config } from '../config'
import { decryptSession } from './crypto.service'
import { redis } from './redis.service'
import { sleep } from '../utils/sleep'

type PhoneCodeState = {
  client: TelegramClient
  phoneCodeHash: string
  phone: string
  expiresAt: number
}

type PersistedPhoneCodeState = {
  phone: string
  sessionString: string
  expiresAt: number
}

export type TelegramDialog = {
  id?: unknown
  title?: string
  name?: string
  entity?: {
    id?: unknown
    className?: string
    username?: string
    self?: boolean
    bot?: boolean
    broadcast?: boolean
    megagroup?: boolean
    photo?: unknown
  }
  photo?: unknown
}

export type TelegramMessageLike = {
  id?: number
  message?: string
  date?: unknown
  outgoing?: boolean
  out?: boolean
  media?: unknown
  voice?: unknown
  sticker?: unknown
  file?: unknown
}

class TelegramPool {
  private clients = new Map<string, TelegramClient>()
  private pending = new Map<string, PhoneCodeState>()
  private clientLeaseTokens = new Map<string, string>()
  private clientLeaseHeartbeats = new Map<string, NodeJS.Timeout>()
  private readonly pendingTtlMs = 5 * 60 * 1000
  private avatarCache = new Map<string, { data: Buffer; expiresAt: number }>()
  private readonly avatarCacheTtlMs = 60 * 60 * 1000
  private readonly avatarCacheMaxEntries = 1000
  private readonly clientLeaseTtlMs = 5 * 60 * 1000
  private readonly clientLeaseWaitTimeoutMs = 15 * 1000
  private readonly clientLeasePollMs = 250

  private getPendingRedisKey(key: string) {
    return `telegram:pending-auth:${key}`
  }

  private async savePendingState(key: string, pending: PhoneCodeState) {
    const ttlSeconds = Math.max(1, Math.ceil((pending.expiresAt - Date.now()) / 1000))
    const payload: PersistedPhoneCodeState = {
      phone: pending.phone,
      sessionString: String(pending.client.session.save()),
      expiresAt: pending.expiresAt,
    }
    await redis.set(this.getPendingRedisKey(key), JSON.stringify(payload), 'EX', ttlSeconds)
  }

  private async loadPendingState(key: string) {
    const raw = await redis.get(this.getPendingRedisKey(key))
    if (!raw) {
      return null
    }

    try {
      const parsed = JSON.parse(raw) as PersistedPhoneCodeState
      if (!parsed.phone || !parsed.sessionString || !parsed.expiresAt || parsed.expiresAt <= Date.now()) {
        await redis.del(this.getPendingRedisKey(key))
        return null
      }

      return parsed
    } catch {
      await redis.del(this.getPendingRedisKey(key))
      return null
    }
  }

  private async deletePendingState(key: string) {
    await redis.del(this.getPendingRedisKey(key))
  }

  private async hydratePendingClient(key: string) {
    const persisted = await this.loadPendingState(key)
    if (!persisted) {
      return null
    }

    const client = new TelegramClient(
      new StringSession(persisted.sessionString),
      config.TELEGRAM_API_ID,
      config.TELEGRAM_API_HASH,
      { connectionRetries: 5 },
    )
    await client.connect()

    const pending = {
      client,
      phoneCodeHash: key,
      phone: persisted.phone,
      expiresAt: persisted.expiresAt,
    } satisfies PhoneCodeState
    this.pending.set(key, pending)
    return pending
  }

  private pruneExpiredPending() {
    const now = Date.now()
    for (const [key, pending] of this.pending.entries()) {
      if (pending.expiresAt > now) {
        continue
      }

      void pending.client.disconnect().catch(() => undefined)
      this.pending.delete(key)
      void this.deletePendingState(key)
    }
  }

  async createPendingClient(phone: string) {
    this.pruneExpiredPending()
    const session = new StringSession('')
    const client = new TelegramClient(
      session,
      config.TELEGRAM_API_ID,
      config.TELEGRAM_API_HASH,
      { connectionRetries: 5 },
    )

    await client.connect()

    const result = await client.sendCode(
      {
        apiId: config.TELEGRAM_API_ID,
        apiHash: config.TELEGRAM_API_HASH,
      },
      phone,
    )

    const phoneCodeHash = result.phoneCodeHash
    this.pending.set(phoneCodeHash, {
      client,
      phoneCodeHash,
      phone,
      expiresAt: Date.now() + this.pendingTtlMs,
    })
    await this.savePendingState(phoneCodeHash, this.pending.get(phoneCodeHash)!)
    return phoneCodeHash
  }

  async getPendingClient(phoneCodeHash: string) {
    this.pruneExpiredPending()
    const existing = this.pending.get(phoneCodeHash)
    if (existing) {
      return existing
    }

    return this.hydratePendingClient(phoneCodeHash)
  }

  async finalizePendingClient(phoneCodeHash: string) {
    this.pruneExpiredPending()
    const pending = await this.getPendingClient(phoneCodeHash)
    if (pending) {
      this.pending.delete(phoneCodeHash)
      await this.deletePendingState(phoneCodeHash)
    }
    return pending
  }

  async abortPendingClient(phoneCodeHash: string) {
    this.pruneExpiredPending()
    const pending = await this.getPendingClient(phoneCodeHash)
    if (pending) {
      await pending.client.disconnect()
      this.pending.delete(phoneCodeHash)
    }
    await this.deletePendingState(phoneCodeHash)
  }

  async rekeyPendingClient(previousKey: string, nextKey: string) {
    this.pruneExpiredPending()
    const pending = await this.getPendingClient(previousKey)
    if (!pending) {
      return false
    }

    this.pending.delete(previousKey)
    await this.deletePendingState(previousKey)

    const nextPending = {
      ...pending,
      phoneCodeHash: nextKey,
      expiresAt: Date.now() + this.pendingTtlMs,
    } satisfies PhoneCodeState
    this.pending.set(nextKey, nextPending)
    await this.savePendingState(nextKey, nextPending)
    return true
  }

  async persistPendingClient(key: string) {
    const pending = await this.getPendingClient(key)
    if (!pending) {
      return false
    }

    pending.expiresAt = Date.now() + this.pendingTtlMs
    await this.savePendingState(key, pending)
    return true
  }

  private getClientLeaseKey(userId: string) {
    return `telegram:client:${userId}`
  }

  private startClientLeaseHeartbeat(userId: string, token: string) {
    this.stopClientLeaseHeartbeat(userId)
    const intervalMs = Math.max(5_000, Math.floor(this.clientLeaseTtlMs / 3))
    const timer = setInterval(() => {
      void this.refreshClientLease(userId, token)
    }, intervalMs)
    timer.unref?.()
    this.clientLeaseHeartbeats.set(userId, timer)
  }

  private stopClientLeaseHeartbeat(userId: string) {
    const timer = this.clientLeaseHeartbeats.get(userId)
    if (timer) {
      clearInterval(timer)
      this.clientLeaseHeartbeats.delete(userId)
    }
  }

  private async refreshClientLease(userId: string, token: string) {
    const key = this.getClientLeaseKey(userId)
    const current = await redis.get(key)
    if (current !== token) {
      this.stopClientLeaseHeartbeat(userId)
      this.clientLeaseTokens.delete(userId)
      return
    }

    await redis.pexpire(key, this.clientLeaseTtlMs)
  }

  private async acquireClientLease(userId: string) {
    const existingToken = this.clientLeaseTokens.get(userId)
    if (existingToken) {
      await this.refreshClientLease(userId, existingToken)
      return existingToken
    }

    const key = this.getClientLeaseKey(userId)
    const token = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`
    const startedAt = Date.now()

    while (Date.now() - startedAt < this.clientLeaseWaitTimeoutMs) {
      const acquired = await redis.set(key, token, 'PX', this.clientLeaseTtlMs, 'NX')
      if (acquired === 'OK') {
        this.clientLeaseTokens.set(userId, token)
        this.startClientLeaseHeartbeat(userId, token)
        return token
      }

      await sleep(this.clientLeasePollMs)
    }

    throw new TelegramSessionBusyError()
  }

  private async releaseClientLease(userId: string) {
    const token = this.clientLeaseTokens.get(userId)
    this.stopClientLeaseHeartbeat(userId)
    this.clientLeaseTokens.delete(userId)

    if (!token) {
      return
    }

    const key = this.getClientLeaseKey(userId)
    const current = await redis.get(key)
    if (current === token) {
      await redis.del(key)
    }
  }

  async connectAuthorizedClient(userId: string, encryptedSession: {
    sessionString: string
    sessionIv: string
    authTag: string
  }) {
    await this.acquireClientLease(userId)

    const existing = this.clients.get(userId)
    if (existing) {
      if (!(existing as { connected?: boolean }).connected) {
        await existing.connect()
      }
      return existing
    }

    const sessionString = decryptSession(
      encryptedSession.sessionString,
      encryptedSession.sessionIv,
      encryptedSession.authTag,
    )

    const client = new TelegramClient(
      new StringSession(sessionString),
      config.TELEGRAM_API_ID,
      config.TELEGRAM_API_HASH,
      { connectionRetries: 5 },
    )

    await client.connect()
    this.clients.set(userId, client)
    return client
  }

  async disconnectAuthorizedClient(userId: string) {
    const client = this.clients.get(userId)
    try {
      if (client) {
        await client.disconnect()
        this.clients.delete(userId)
      }
    } finally {
      await this.releaseClientLease(userId)
    }
  }

  async getDialogAvatar(userId: string, dialogId: string, client: TelegramClient) {
    this.pruneAvatarCache()
    const cacheKey = `${userId}:${dialogId}`
    const cached = this.avatarCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data
    }

    const dialogs = await client.getDialogs({ limit: 500 })
    const dialog = dialogs.find((item) => String(item.id) === dialogId) as TelegramDialog | undefined
    const entity = dialog?.entity
    if (!dialog || !(entity?.photo ?? dialog.photo ?? dialog.entity?.photo)) {
      return null
    }

    const buffer = await client.downloadProfilePhoto(entity as never, {
      isBig: false,
    })

    if (!Buffer.isBuffer(buffer)) {
      return null
    }

    this.avatarCache.set(cacheKey, {
      data: buffer,
      expiresAt: Date.now() + this.avatarCacheTtlMs,
    })
    this.pruneAvatarCache()

    return buffer
  }

  async getSelfAvatar(userId: string, client: TelegramClient) {
    this.pruneAvatarCache()
    const cacheKey = `${userId}:self`
    const cached = this.avatarCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data
    }

    const me = await client.getMe()
    if (!me) {
      return null
    }

    const buffer = await client.downloadProfilePhoto(me as never, {
      isBig: false,
    })

    if (!Buffer.isBuffer(buffer)) {
      return null
    }

    this.avatarCache.set(cacheKey, {
      data: buffer,
      expiresAt: Date.now() + this.avatarCacheTtlMs,
    })
    this.pruneAvatarCache()

    return buffer
  }

  private pruneAvatarCache() {
    const now = Date.now()
    for (const [key, value] of this.avatarCache.entries()) {
      if (value.expiresAt <= now) {
        this.avatarCache.delete(key)
      }
    }

    while (this.avatarCache.size > this.avatarCacheMaxEntries) {
      const oldestKey = this.avatarCache.keys().next().value
      if (!oldestKey) {
        break
      }
      this.avatarCache.delete(oldestKey)
    }
  }
}

export const telegramPool = new TelegramPool()

export class TelegramSessionBusyError extends Error {
  constructor() {
    super('Telegram session is busy with another operation')
    this.name = 'TelegramSessionBusyError'
  }
}

export function normalizeTelegramDialogType(dialog: TelegramDialog): 'private' | 'group' | 'channel' | 'bot' | 'unknown' {
  const entity = dialog.entity ?? {}
  const className = String(entity.className ?? '').toLowerCase()

  if (entity.bot) {
    return 'bot'
  }
  if (className.includes('user')) {
    return 'private'
  }
  if (entity.broadcast) {
    return 'channel'
  }
  if (entity.megagroup || className.includes('chat') || className.includes('channel')) {
    return 'group'
  }
  return 'unknown'
}

export function isSystemTelegramDialog(dialog: TelegramDialog) {
  const entity = dialog.entity ?? {}
  const normalizedTitle = String(dialog.title ?? dialog.name ?? '').trim().toLowerCase()
  const normalizedUsername = String(entity.username ?? '').trim().toLowerCase()
  const rawId = entity.id ?? dialog.id
  const numericId = typeof rawId === 'number' ? rawId : Number(rawId)

  return entity.self === true
    || numericId === 777000
    || normalizedUsername === 'telegram'
    || normalizedTitle === 'telegram'
}

export function getTelegramUserData(client: TelegramClient) {
  const entity = client.getMe() as unknown as Promise<{
    id: { value?: bigint } | number
    username?: string
    firstName?: string
  }>
  return entity
}

export async function signInWithCode(phone: string, code: string, phoneCodeHash: string) {
  const pending = await telegramPool.getPendingClient(phoneCodeHash)
  if (!pending || pending.phone !== phone) {
    throw new Error('Phone code session not found or expired')
  }

  try {
    await pending.client.invoke(new Api.auth.SignIn({
      phoneNumber: phone,
      phoneCodeHash,
      phoneCode: code,
    }))
    return { needsPassword: false as const, client: pending.client }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message.includes('SESSION_PASSWORD_NEEDED')) {
      await telegramPool.persistPendingClient(phoneCodeHash)
      return { needsPassword: true as const, client: pending.client }
    }
    throw error
  }
}

export async function signInWithPassword(tempToken: string, password: string) {
  const pending = await telegramPool.getPendingClient(tempToken)
  if (!pending) {
    throw new Error('Password verification session not found or expired')
  }

  const telegramClient = pending.client as unknown as { invoke(request: unknown): Promise<unknown> }
  const passwordInfo = await telegramClient.invoke(new Api.account.GetPassword())
  const passwordCheck = await telegramClient.invoke(new Api.auth.CheckPassword({
    password: await computeCheck(passwordInfo as Parameters<typeof computeCheck>[0], password),
  }))
  if (!(passwordCheck as { user?: unknown }).user) {
    throw new Error('2FA verification failed')
  }

  await telegramPool.persistPendingClient(tempToken)
  return pending.client
}

export function exportSession(client: TelegramClient) {
  return String(client.session.save())
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
  const message = String((error as { errorMessage?: unknown; message?: unknown })?.errorMessage ?? (error as Error)?.message ?? '')
  return /AUTH_KEY_UNREGISTERED|SESSION_REVOKED|SESSION_EXPIRED|USER_DEACTIVATED|AUTH_KEY_INVALID/i.test(message)
}

export function isTelegramSessionDuplicatedError(error: unknown) {
  const message = String((error as { errorMessage?: unknown; message?: unknown })?.errorMessage ?? (error as Error)?.message ?? '')
  return /AUTH_KEY_DUPLICATED/i.test(message)
}

export function isTelegramSessionBusyError(error: unknown) {
  return error instanceof TelegramSessionBusyError
}

export async function withTelegramReconnectRetry<T>(
  action: () => Promise<T>,
  resetConnection: () => Promise<void>,
  maxAttempts = 2,
): Promise<T> {
  let attempt = 0

  while (attempt < maxAttempts) {
    try {
      return await action()
    } catch (error) {
      attempt += 1
      if (!isTelegramSessionDuplicatedError(error) || attempt >= maxAttempts) {
        throw error
      }

      await resetConnection()
      await sleep(400)
    }
  }

  return action()
}

export async function withFloodWaitRetry<T>(action: () => Promise<T>, maxAttempts = 2): Promise<T> {
  let attempt = 0
  while (attempt < maxAttempts) {
    try {
      return await action()
    } catch (error) {
      attempt += 1
      const seconds = getFloodWaitSeconds(error)
      if (!seconds || attempt >= maxAttempts) {
        throw error
      }
      await sleep((seconds + 1) * 1000)
    }
  }

  return action()
}

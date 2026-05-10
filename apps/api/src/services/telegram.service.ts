import { Api, TelegramClient } from 'telegram'
import { computeCheck } from 'telegram/Password'
import { StringSession } from 'telegram/sessions/index.js'
import { config } from '../config'
import { decryptSession } from './crypto.service'
import { sleep } from '../utils/sleep'

type PhoneCodeState = {
  client: TelegramClient
  phoneCodeHash: string
  phone: string
  expiresAt: number
}

export type TelegramDialog = {
  id?: unknown
  title?: string
  name?: string
  entity?: {
    className?: string
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
  private readonly pendingTtlMs = 5 * 60 * 1000
  private avatarCache = new Map<string, { data: Buffer; expiresAt: number }>()
  private readonly avatarCacheTtlMs = 60 * 60 * 1000
  private readonly avatarCacheMaxEntries = 1000

  private pruneExpiredPending() {
    const now = Date.now()
    for (const [key, pending] of this.pending.entries()) {
      if (pending.expiresAt > now) {
        continue
      }

      void pending.client.disconnect().catch(() => undefined)
      this.pending.delete(key)
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
    return phoneCodeHash
  }

  getPendingClient(phoneCodeHash: string) {
    this.pruneExpiredPending()
    return this.pending.get(phoneCodeHash) ?? null
  }

  async finalizePendingClient(phoneCodeHash: string) {
    this.pruneExpiredPending()
    const pending = this.pending.get(phoneCodeHash)
    if (pending) {
      this.pending.delete(phoneCodeHash)
    }
    return pending
  }

  async abortPendingClient(phoneCodeHash: string) {
    this.pruneExpiredPending()
    const pending = this.pending.get(phoneCodeHash)
    if (pending) {
      await pending.client.disconnect()
      this.pending.delete(phoneCodeHash)
    }
  }

  rekeyPendingClient(previousKey: string, nextKey: string) {
    this.pruneExpiredPending()
    const pending = this.pending.get(previousKey)
    if (!pending) {
      return false
    }
    this.pending.delete(previousKey)
    this.pending.set(nextKey, {
      ...pending,
      expiresAt: Date.now() + this.pendingTtlMs,
    })
    return true
  }

  async connectAuthorizedClient(userId: string, encryptedSession: {
    sessionString: string
    sessionIv: string
    authTag: string
  }) {
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
    if (!client) {
      return
    }
    await client.disconnect()
    this.clients.delete(userId)
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

export function getTelegramUserData(client: TelegramClient) {
  const entity = client.getMe() as unknown as Promise<{
    id: { value?: bigint } | number
    username?: string
    firstName?: string
  }>
  return entity
}

export async function signInWithCode(phone: string, code: string, phoneCodeHash: string) {
  const pending = telegramPool.getPendingClient(phoneCodeHash)
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
      return { needsPassword: true as const, client: pending.client }
    }
    throw error
  }
}

export async function signInWithPassword(tempToken: string, password: string) {
  const pending = telegramPool.getPendingClient(tempToken)
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

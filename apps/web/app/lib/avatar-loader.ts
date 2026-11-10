import { MAX_AVATAR_BATCH } from '@tg-analyzer/shared'
import { api, ApiClientError } from '../composables/useApi'

/**
 * Collects avatar requests from all rendered chats for a moment and fetches
 * them in one batch, so the server talks to Telegram over one connection.
 */
const cache = new Map<string, Promise<string | null>>()
let pending = new Map<string, (url: string | null) => void>()
let flushTimer: ReturnType<typeof setTimeout> | null = null
let generation = 0

async function flush() {
  flushTimer = null
  const batch = pending
  pending = new Map()
  const ids = [...batch.keys()]
  const currentGeneration = generation

  for (let start = 0; start < ids.length; start += MAX_AVATAR_BATCH) {
    if (generation !== currentGeneration) {
      for (const resolve of batch.values()) resolve(null)
      return
    }
    const chunk = ids.slice(start, start + MAX_AVATAR_BATCH)
    try {
      const { avatars } = await api('POST /api/v1/parse/avatars', { body: { chatIds: chunk } })
      for (const id of chunk) {
        if (generation !== currentGeneration) {
          batch.get(id)?.(null)
          continue
        }
        if (id in avatars) batch.get(id)?.(avatars[id] ?? null)
        else {
          // Not loaded (Telegram busy): allow a later retry.
          cache.delete(id)
          batch.get(id)?.(null)
        }
      }
    } catch {
      for (const id of chunk) {
        if (generation === currentGeneration) cache.delete(id)
        batch.get(id)?.(null)
      }
    }
  }
}

export function loadChatAvatar(chatId: string): Promise<string | null> {
  let request = cache.get(chatId)
  if (!request) {
    request = new Promise((resolve) => pending.set(chatId, resolve))
    cache.set(chatId, request)
    flushTimer ??= setTimeout(() => void flush(), 60)
  }
  return request
}

export function clearAvatarCache() {
  generation += 1
  cache.clear()
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = null
  for (const resolve of pending.values()) resolve(null)
  pending.clear()
  void profileRequest?.then((url) => {
    if (url) URL.revokeObjectURL(url)
  })
  profileRequest = null
}

let profileRequest: Promise<string | null> | null = null

const PROFILE_RETRY_MS = [1500, 4000, 9000]

async function fetchProfileAvatar(currentGeneration: number): Promise<string | null> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const blob = await api('GET /api/v1/auth/avatar')
      return generation === currentGeneration ? URL.createObjectURL(blob) : null
    } catch (error: unknown) {
      // No photo (404) is an answer, not a failure: keep it, so every page does not ask again.
      if (error instanceof ApiClientError && error.status === 404) return null
      // Telegram is busy with the chat list at the same moment (409) or slowed us down (429): ask again shortly.
      const delay = PROFILE_RETRY_MS[attempt]
      if (delay === undefined || generation !== currentGeneration) {
        if (generation === currentGeneration) profileRequest = null
        return null
      }
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

/** The signed-in user's own photo as a blob URL; one request per page load, retried while Telegram is busy. */
export function loadProfileAvatar() {
  profileRequest ??= fetchProfileAvatar(generation)
  return profileRequest
}

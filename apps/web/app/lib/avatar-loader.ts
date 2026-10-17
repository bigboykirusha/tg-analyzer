import { MAX_AVATAR_BATCH } from '@tg-analyzer/shared'
import { api } from '../composables/useApi'

/**
 * Collects avatar requests from all rendered chats for a moment and fetches
 * them in one batch, so the server talks to Telegram over one connection.
 */
const cache = new Map<string, Promise<string | null>>()
let pending = new Map<string, (url: string | null) => void>()
let flushTimer: ReturnType<typeof setTimeout> | null = null

async function flush() {
  flushTimer = null
  const batch = pending
  pending = new Map()
  const ids = [...batch.keys()]

  for (let start = 0; start < ids.length; start += MAX_AVATAR_BATCH) {
    const chunk = ids.slice(start, start + MAX_AVATAR_BATCH)
    try {
      const { avatars } = await api('POST /api/v1/parse/avatars', { body: { chatIds: chunk } })
      for (const id of chunk) {
        if (id in avatars) batch.get(id)?.(avatars[id] ?? null)
        else {
          // Not loaded (Telegram busy): allow a later retry.
          cache.delete(id)
          batch.get(id)?.(null)
        }
      }
    } catch {
      for (const id of chunk) {
        cache.delete(id)
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
  cache.clear()
}

let profileRequest: Promise<string | null> | null = null

/** The signed-in user's own photo as a blob URL; one request per page load. */
export function loadProfileAvatar() {
  profileRequest ??= api('GET /api/v1/auth/avatar')
    .then((blob) => URL.createObjectURL(blob))
    .catch(() => {
      profileRequest = null
      return null
    })
  return profileRequest
}

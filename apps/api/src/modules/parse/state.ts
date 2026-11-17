import type { DialogsResponse, ParseProgressDto, RecentActivityResponse } from '@tg-analyzer/shared'
import { config } from '../../config'
import { redis } from '../../lib/redis'

/** Transient analysis state kept in Redis. PostgreSQL stays the source of truth for jobs. */

export const PROGRESS_CHANNEL = 'parse:progress'
const PROGRESS_TTL_SECONDS = 60 * 60
const DIALOG_CACHE_TTL_SECONDS = 6 * 60 * 60

const progressKey = (userId: string) => `parse:progress:${userId}`
const cancelledJobKey = (jobId: string) => `parse:cancelled:${jobId}`
const cooldownKey = (userId: string, chatId: string) => `parse:cooldown:${userId}:${chatId}`
const dialogsKey = (userId: string) => `telegram:dialogs:${userId}`

export function idleProgress(): ParseProgressDto {
  return {
    jobId: null,
    status: 'idle',
    phase: null,
    chatId: null,
    chatTitle: null,
    scannedMessages: 0,
    totalMessages: null,
    startedAt: null,
    reachedAt: null,
    pulse: null,
    waitSeconds: null,
    error: null,
  }
}

export interface ProgressMessage {
  userId: string
  progress: ParseProgressDto
}

/** Stores the latest snapshot for active jobs and broadcasts it to the user's open sockets. */
export async function publishProgress(userId: string, progress: ParseProgressDto) {
  const active = progress.status === 'pending' || progress.status === 'running'
  const message = JSON.stringify({ userId, progress } satisfies ProgressMessage)
  if (active && progress.jobId) {
    // A worker or enqueue request can be between its database check and this write when deletion commits.
    await redis.eval(
      `if redis.call('exists', KEYS[2]) == 0 then
         redis.call('set', KEYS[1], ARGV[1], 'EX', ARGV[2])
         redis.call('publish', ARGV[3], ARGV[4])
       end`,
      2,
      progressKey(userId),
      cancelledJobKey(progress.jobId),
      JSON.stringify(progress),
      PROGRESS_TTL_SECONDS,
      PROGRESS_CHANNEL,
      message,
    )
    return
  }
  await redis.del(progressKey(userId))
  await redis.publish(PROGRESS_CHANNEL, message)
}

/** Clear and announce a cancellation only while that job owns the user's progress snapshot. */
export async function publishCancellation(userId: string, progress: ParseProgressDto & { jobId: string }) {
  await redis.eval(
    `redis.call('set', KEYS[2], '1', 'EX', ARGV[4])
     local snapshot = redis.call('get', KEYS[1])
     if snapshot and cjson.decode(snapshot).jobId == ARGV[1] then
       redis.call('del', KEYS[1])
       redis.call('publish', ARGV[2], ARGV[3])
     end`,
    2,
    progressKey(userId),
    cancelledJobKey(progress.jobId),
    progress.jobId,
    PROGRESS_CHANNEL,
    JSON.stringify({ userId, progress } satisfies ProgressMessage),
    PROGRESS_TTL_SECONDS,
  )
}

export async function readProgress(userId: string): Promise<ParseProgressDto | null> {
  const raw = await redis.get(progressKey(userId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as ParseProgressDto
  } catch {
    return null
  }
}

/** Seconds until the chat may be analysed again, or 0. */
export async function cooldownSeconds(userId: string, chatId: string) {
  return Math.max(0, await redis.ttl(cooldownKey(userId, chatId)))
}

export async function startCooldown(userId: string, chatId: string) {
  if (config.CHAT_REPARSE_COOLDOWN_MINUTES > 0) {
    await redis.set(cooldownKey(userId, chatId), '1', 'EX', config.CHAT_REPARSE_COOLDOWN_MINUTES * 60)
  }
}

export async function cacheDialogs(userId: string, dialogs: Omit<DialogsResponse, 'stale'>) {
  await redis.set(dialogsKey(userId), JSON.stringify(dialogs), 'EX', DIALOG_CACHE_TTL_SECONDS)
}

export async function readCachedDialogs(userId: string): Promise<Omit<DialogsResponse, 'stale'> | null> {
  const raw = await redis.get(dialogsKey(userId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as Omit<DialogsResponse, 'stale'>
  } catch {
    return null
  }
}

const avatarKey = (userId: string, chatId: string) => `telegram:avatar:${userId}:${chatId}`
const AVATAR_CACHE_TTL_SECONDS = 24 * 60 * 60
const NO_AVATAR = '-'

/** Cached avatar data URLs; `null` means "known to have no photo", `undefined` means "not cached". */
export async function readCachedAvatars(userId: string, chatIds: string[]) {
  const values = await redis.mget(chatIds.map((chatId) => avatarKey(userId, chatId)))
  return new Map(
    chatIds.map((chatId, index) => {
      const value = values[index]
      return [chatId, value === null || value === undefined ? undefined : value === NO_AVATAR ? null : value]
    }),
  )
}

export async function cacheAvatar(userId: string, chatId: string, dataUrl: string | null) {
  await redis.set(avatarKey(userId, chatId), dataUrl ?? NO_AVATAR, 'EX', AVATAR_CACHE_TTL_SECONDS)
}

const recentKey = (userId: string) => `telegram:recent:${userId}`
const RECENT_CACHE_TTL_SECONDS = 6 * 60 * 60

export interface CachedRecentActivity {
  computedAt: number
  activity: Omit<RecentActivityResponse, 'stale'>
}

export async function cacheRecentActivity(userId: string, activity: Omit<RecentActivityResponse, 'stale'>) {
  const value: CachedRecentActivity = { computedAt: Date.now(), activity }
  await redis.set(recentKey(userId), JSON.stringify(value), 'EX', RECENT_CACHE_TTL_SECONDS)
}

export async function readCachedRecentActivity(userId: string): Promise<CachedRecentActivity | null> {
  const raw = await redis.get(recentKey(userId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as CachedRecentActivity
  } catch {
    return null
  }
}

const sizesKey = (userId: string) => `telegram:sizes:${userId}`
const SIZES_TTL_SECONDS = 7 * 24 * 60 * 60

/**
 * Chats Telegram has told us are too small for a report. Asking Telegram about every dialog would cost a
 * request each, so a size is remembered from the answers that were needed anyway: the home summary, the
 * check before an analysis, a failed one. A chat that has grown past the minimum is forgotten.
 */
export async function rememberChatSize(userId: string, chatId: string, total: number, minimum: number) {
  if (total < minimum) {
    await redis.hset(sizesKey(userId), chatId, String(total))
    await redis.expire(sizesKey(userId), SIZES_TTL_SECONDS)
  } else await redis.hdel(sizesKey(userId), chatId)
}

/** Ids of the user's chats known to be too small; empty when nothing is remembered. */
export async function readSmallChats(userId: string): Promise<Set<string>> {
  return new Set(Object.keys(await redis.hgetall(sizesKey(userId))))
}

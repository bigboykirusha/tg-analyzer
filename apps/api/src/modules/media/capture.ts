import { createWriteStream } from 'node:fs'
import { mkdir, rename, rm, stat } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import { DelayedError, Queue, type Job } from 'bullmq'
import { and, asc, countDistinct, eq } from 'drizzle-orm'
import type { MessageInput } from '@tg-analyzer/shared'
import { config } from '../../config'
import { db, schema } from '../../db'
import { logger } from '../../lib/logger'
import { createRedisConnection } from '../../lib/redis'
import { telegram, TelegramBusyError, TelegramFloodWaitError, TelegramSessionRevokedError } from '../../telegram'
import { getTelegramSession } from '../account/telegram-sessions'
import { listUserActiveJobs } from '../parse/jobs'

/**
 * Developers' own photos, videos and video notes, kept as files in their original quality (19.11). Only the users
 * named in `MEDIA_CAPTURE_USERNAMES`, only their own messages, only in their first three analysed private chats.
 *
 * Analyses always come first: the analysis only notes which messages carry such files (no extra request), and the
 * files are fetched afterwards by a queue of their own, in slices of a few seconds. Between slices the Telegram
 * session is free and an analysis waiting for it (or about to start) goes ahead; a file continues where it stopped.
 * The files are removed with the report.
 */

export const MEDIA_QUEUE = 'media-capture'
/** Private chats per developer whose files are kept. */
export const MEDIA_CAPTURE_CHATS = 3
/** How long one slice may hold the Telegram session: well under the 15 s an API request waits for it. */
const SLICE_MS = 8_000
/** How long a slice waits for the session before stepping aside. */
const SESSION_WAIT_MS = 2_000
/** When an analysis runs or Telegram is busy, look again after this long. */
const RECHECK_MS = 30_000

export interface MediaJobData {
  userId: string
}

export interface OwnAttachment {
  messageId: string
  kind: NonNullable<MessageInput['attachment']>
  sentAt: Date
}

const mediaRoot = () => (isAbsolute(config.MEDIA_DIR) ? config.MEDIA_DIR : resolve(process.cwd(), config.MEDIA_DIR))
const chatDir = (userId: string, chatId: number | string) => join(mediaRoot(), userId, String(chatId))

export function capturesMediaOf(username: string | null | undefined) {
  return Boolean(username) && config.MEDIA_CAPTURE_USERNAMES.includes(username!.toLowerCase())
}

let queue: Queue<MediaJobData> | null = null
let connection: ReturnType<typeof createRedisConnection> | null = null

function mediaQueue() {
  queue ??= new Queue<MediaJobData>(MEDIA_QUEUE, {
    connection: (connection = createRedisConnection()),
    defaultJobOptions: { removeOnComplete: true, removeOnFail: 100 },
  })
  return queue
}

/** One capture job per user: a second request while one waits or runs is a no-op, the running one finds new rows. */
export async function enqueueMediaCapture(userId: string) {
  await mediaQueue().add('capture', { userId }, { jobId: `capture-${userId}` })
}

export async function closeMediaQueue() {
  await queue?.close()
  await connection?.quit().catch(() => undefined)
  queue = null
  connection = null
}

/**
 * Notes the user's own files of an analysed private chat as `pending` and wakes the capture queue — for the first
 * three chats only (a refreshed chat adds its new messages). Returns how many were noted.
 */
export async function recordOwnMedia(userId: string, chatId: string, items: OwnAttachment[]) {
  if (!items.length) return 0
  const tgChatId = Number(chatId)
  const [known] = await db
    .select({ chats: countDistinct(schema.capturedMedia.tgChatId) })
    .from(schema.capturedMedia)
    .where(eq(schema.capturedMedia.userId, userId))
  const [already] = await db
    .select({ id: schema.capturedMedia.id })
    .from(schema.capturedMedia)
    .where(and(eq(schema.capturedMedia.userId, userId), eq(schema.capturedMedia.tgChatId, tgChatId)))
    .limit(1)
  if (!already && (known?.chats ?? 0) >= MEDIA_CAPTURE_CHATS) return 0

  let noted = 0
  for (let at = 0; at < items.length; at += 1_000) {
    const rows = await db
      .insert(schema.capturedMedia)
      .values(
        items.slice(at, at + 1_000).map((item) => ({
          userId,
          tgChatId,
          messageId: Number(item.messageId),
          kind: item.kind,
          sentAt: item.sentAt,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: schema.capturedMedia.id })
    noted += rows.length
  }
  if (noted) await enqueueMediaCapture(userId)
  return noted
}

/** With the report: the rows go in its transaction, the files after it (`removeChatMediaFiles`). */
export function deleteChatMediaRows(writer: Pick<typeof db, 'delete'>, userId: string, chatId: number) {
  return writer
    .delete(schema.capturedMedia)
    .where(and(eq(schema.capturedMedia.userId, userId), eq(schema.capturedMedia.tgChatId, chatId)))
}

export async function removeChatMediaFiles(userId: string, chatId: number | string) {
  await rm(chatDir(userId, chatId), { recursive: true, force: true })
}

async function sizeOf(path: string) {
  try {
    return (await stat(path)).size
  } catch {
    return 0
  }
}

async function rowExists(id: string) {
  const [row] = await db
    .select({ id: schema.capturedMedia.id })
    .from(schema.capturedMedia)
    .where(eq(schema.capturedMedia.id, id))
  return Boolean(row)
}

async function setStatus(id: string, status: 'skipped' | 'failed') {
  await db.update(schema.capturedMedia).set({ status }).where(eq(schema.capturedMedia.id, id))
}

/** Steps aside for `ms`: BullMQ runs the job again then, from the first pending file. */
async function later(job: Job<MediaJobData>, token: string | undefined, ms: number): Promise<never> {
  if (!token) throw new Error('A media capture job needs a worker token to wait')
  await job.moveToDelayed(Date.now() + ms, token)
  throw new DelayedError()
}

/** The capture queue's worker: fetches the user's pending files one slice at a time until none is left. */
export async function runMediaCapture(job: Job<MediaJobData>, token?: string) {
  const { userId } = job.data
  for (;;) {
    // An analysis of this user is running or queued: it has the session first.
    if ((await listUserActiveJobs(userId)).length) await later(job, token, RECHECK_MS)
    const [item] = await db
      .select()
      .from(schema.capturedMedia)
      .where(and(eq(schema.capturedMedia.userId, userId), eq(schema.capturedMedia.status, 'pending')))
      .orderBy(asc(schema.capturedMedia.tgChatId), asc(schema.capturedMedia.messageId))
      .limit(1)
    if (!item) return

    const session = await getTelegramSession(userId)
    // Signed out of Telegram: the rows wait for the next sign-in and analysis.
    if (!session) return

    const dir = chatDir(userId, item.tgChatId)
    const part = join(dir, `${item.messageId}.part`)
    await mkdir(dir, { recursive: true })
    const offset = await sizeOf(part)

    let slice
    try {
      slice = await telegram.withSession(
        userId,
        session,
        async (api) => {
          const out = createWriteStream(part, { flags: 'a' })
          const closed = new Promise<void>((done, fail) => {
            out.on('close', done)
            out.on('error', fail)
          })
          try {
            return await api.downloadOwnMedia(
              String(item.tgChatId),
              String(item.messageId),
              offset,
              SLICE_MS,
              (chunk) =>
                out.write(chunk) ? Promise.resolve() : new Promise((done) => out.once('drain', () => done())),
            )
          } finally {
            out.end()
            await closed
          }
        },
        { waitMs: SESSION_WAIT_MS },
      )
    } catch (error) {
      if (error instanceof TelegramBusyError) await later(job, token, RECHECK_MS)
      if (error instanceof TelegramFloodWaitError) await later(job, token, (error.seconds + 1) * 1000)
      if (error instanceof TelegramSessionRevokedError) return
      logger.warn({ err: error, userId, messageId: item.messageId }, 'media capture failed; skipping the file')
      await setStatus(item.id, 'failed')
      await rm(part, { force: true })
      continue
    }

    // The report was deleted meanwhile: its files go with it.
    if (!(await rowExists(item.id))) {
      await removeChatMediaFiles(userId, item.tgChatId)
      continue
    }
    if (!slice) {
      await setStatus(item.id, 'skipped')
      await rm(part, { force: true })
      continue
    }
    if (!slice.done) continue

    const name = `${item.messageId}.${slice.extension}`
    const file = join(dir, name)
    await rename(part, file)
    const [saved] = await db
      .update(schema.capturedMedia)
      .set({
        status: 'saved',
        path: join(userId, String(item.tgChatId), name),
        bytes: await sizeOf(file),
        savedAt: new Date(),
      })
      .where(eq(schema.capturedMedia.id, item.id))
      .returning({ id: schema.capturedMedia.id })
    if (!saved) await rm(file, { force: true })
  }
}

/** On start: wakes the queue for everyone with files still to fetch (a restart mid-file continues it). */
export async function resumeMediaCapture() {
  if (!config.MEDIA_CAPTURE_USERNAMES.length) return
  const users = await db
    .selectDistinct({ userId: schema.capturedMedia.userId })
    .from(schema.capturedMedia)
    .where(eq(schema.capturedMedia.status, 'pending'))
  for (const { userId } of users) await enqueueMediaCapture(userId)
}

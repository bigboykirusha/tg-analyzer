import { eq } from 'drizzle-orm'
import { db, schema } from '../../db'
import { cancelActiveJob, cancelAllActiveJobs } from '../parse/jobs'
import { removeQueuedAnalysis } from '../parse/queue'
import { idleProgress, publishProgress, purgeUserState } from '../parse/state'
import { deleteTelegramSession, getTelegramSession, logOutTelegramSession } from './telegram-sessions'

/**
 * Signs the app out of the user's Telegram and forgets the authorization.
 * Reports stay; queued and running analyses stop, since they need the session.
 */
export async function disconnectTelegram(userId: string) {
  const cancelled = await cancelAllActiveJobs(userId)
  await Promise.all(cancelled.map((jobId) => removeQueuedAnalysis(jobId)))
  if (cancelled.length) await publishProgress(userId, idleProgress())

  const session = await getTelegramSession(userId)
  if (session) await logOutTelegramSession(userId, session)
  await deleteTelegramSession(userId)
}

/**
 * Deletes the account and everything derived from it. The Telegram
 * authorization is terminated first so it does not linger in the user's
 * Telegram "Active sessions" list.
 */
export async function deleteAccount(userId: string) {
  const activeJob = await cancelActiveJob(userId)
  if (activeJob) await removeQueuedAnalysis(activeJob.id)

  const session = await getTelegramSession(userId)
  if (session) await logOutTelegramSession(userId, session)

  // Reports, jobs, sessions and refresh tokens cascade from the user row.
  await db.delete(schema.users).where(eq(schema.users.id, userId))
  await purgeUserState(userId)
}

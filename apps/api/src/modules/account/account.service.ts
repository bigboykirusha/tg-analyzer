import { eq } from 'drizzle-orm'
import { db, schema } from '../../db'
import { cancelActiveJob } from '../parse/jobs'
import { removeQueuedAnalysis } from '../parse/queue'
import { purgeUserState } from '../parse/state'
import { getTelegramSession, logOutTelegramSession } from './telegram-sessions'

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

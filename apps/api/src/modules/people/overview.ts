import { computeContactStats, PEOPLE_WINDOW_DAYS, type ContactStatsDto } from '@tg-analyzer/shared'
import { UnrecoverableError, type Job } from 'bullmq'
import { logger } from '../../lib/logger'
import { DAY_MS } from '../../lib/time'
import { telegram, TelegramSessionRevokedError, type TelegramAccountApi, type TelegramDialog } from '../../telegram'
import { deactivateTelegramSession, getTelegramSession } from '../account/telegram-sessions'
import type { PeopleJobData } from './queue'
import { markFailed, markRunning, saveContacts, saveProgress } from './repository'

/** Most recent private chats included in the overview. */
const MAX_CHATS = 60
/** Chats read while holding the Telegram session; it is released between batches. */
const BATCH_SIZE = 10
/** History pages (100 messages each) read per chat at most. */
const MAX_PAGES_PER_CHAT = 10
/** A background job may wait for a running analysis to release the session. */
const LEASE_WAIT_MS = 5 * 60 * 1000

/**
 * Builds the «Мои люди» overview: reads only the last 90 days of the most
 * recent private chats, in small batches so analyses and API requests can use
 * the Telegram session in between.
 */
export async function runPeopleOverview(job: Job<PeopleJobData>) {
  const { userId } = job.data
  try {
    const session = await getTelegramSession(userId)
    if (!session) throw new UnrecoverableError('telegram_session_expired')

    const { dialogs } = await telegram.withSession(userId, session, (api) => api.listDialogs(), {
      waitMs: LEASE_WAIT_MS,
    })
    const chats = dialogs.filter((dialog) => dialog.type === 'private').slice(0, MAX_CHATS)
    await markRunning(userId, chats.length)

    const now = Date.now()
    const contacts: ContactStatsDto[] = []
    for (let start = 0; start < chats.length; start += BATCH_SIZE) {
      const batch = chats.slice(start, start + BATCH_SIZE)
      const stats = await telegram.withSession(
        userId,
        session,
        async (api) => {
          const result: ContactStatsDto[] = []
          for (const chat of batch) result.push(await readContact(api, chat, now))
          return result
        },
        { waitMs: LEASE_WAIT_MS },
      )
      contacts.push(...stats)
      await saveProgress(userId, contacts.length)
    }

    await saveContacts(
      userId,
      contacts.filter((contact) => contact.messages90 > 0).sort((left, right) => right.last30 - left.last30),
    )
    logger.info({ userId, chats: chats.length }, 'people overview completed')
  } catch (error) {
    if (error instanceof TelegramSessionRevokedError) {
      await deactivateTelegramSession(userId)
      await markFailed(userId)
      throw new UnrecoverableError('telegram_session_expired')
    }
    const lastAttempt = error instanceof UnrecoverableError || job.attemptsMade + 1 >= (job.opts.attempts ?? 1)
    if (lastAttempt) await markFailed(userId)
    logger.warn({ err: error, userId, lastAttempt }, 'people overview failed')
    throw error
  }
}

async function readContact(api: TelegramAccountApi, chat: TelegramDialog, now: number): Promise<ContactStatsDto> {
  const cutoff = now - PEOPLE_WINDOW_DAYS * DAY_MS
  const points: { ts: number; outgoing: boolean }[] = []
  let offsetId: number | null = 0
  for (let page = 0; page < MAX_PAGES_PER_CHAT && offsetId !== null; page += 1) {
    const history = await api.getHistory(chat.id, offsetId)
    let reachedCutoff = false
    for (const message of history.messages) {
      const ts = message.date.getTime()
      if (ts < cutoff) {
        reachedCutoff = true
        continue
      }
      points.push({ ts, outgoing: message.outgoing })
    }
    // Pages come newest first, so an old message means the window is covered.
    offsetId = reachedCutoff ? null : history.nextOffsetId
  }
  return computeContactStats({ chatId: chat.id, title: chat.title, hasAvatar: chat.hasAvatar, messages: points }, now)
}

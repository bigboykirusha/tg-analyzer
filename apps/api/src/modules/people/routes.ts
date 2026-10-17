import type { PeopleOverviewDto } from '@tg-analyzer/shared'
import type { FastifyPluginAsync } from 'fastify'
import { HOUR_MS, MINUTE_MS } from '../../lib/time'
import { hasActiveTelegramSession } from '../account/telegram-sessions'
import { telegramReauthRequired } from '../account/telegram-access'
import { requireAuth, userIdOf } from '../auth/guard'
import { enqueuePeopleOverview } from './queue'
import { getOverview, markRunning, toOverviewDto } from './repository'

/** A finished overview is refreshed on the next visit after this long. */
const REFRESH_AFTER_MS = 24 * HOUR_MS
/** A run that has not reported progress for this long is considered dead. */
const RUN_TIMEOUT_MS = 15 * MINUTE_MS
/** After a failure the page waits this long before trying again on its own. */
const RETRY_FAILED_AFTER_MS = HOUR_MS

type OverviewRow = Awaited<ReturnType<typeof getOverview>>

function isRunning(row: OverviewRow) {
  return row?.status === 'running' && Date.now() - row.updatedAt.getTime() < RUN_TIMEOUT_MS
}

function needsRefresh(row: OverviewRow) {
  if (!row) return true
  if (isRunning(row)) return false
  if (row.status === 'failed') return Date.now() - row.updatedAt.getTime() > RETRY_FAILED_AFTER_MS
  return !row.computedAt || Date.now() - row.computedAt.getTime() > REFRESH_AFTER_MS
}

async function start(userId: string): Promise<PeopleOverviewDto> {
  await markRunning(userId)
  await enqueuePeopleOverview(userId)
  return toOverviewDto(await getOverview(userId))
}

export const peopleRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  /** Returns the overview and starts a refresh when it is missing or a day old. */
  app.get('/', async (request): Promise<PeopleOverviewDto> => {
    const userId = userIdOf(request)
    const row = await getOverview(userId)
    if (needsRefresh(row) && (await hasActiveTelegramSession(userId))) return start(userId)
    return toOverviewDto(row)
  })

  app.post('/refresh', async (request): Promise<PeopleOverviewDto> => {
    const userId = userIdOf(request)
    if (!(await hasActiveTelegramSession(userId))) throw telegramReauthRequired()
    const row = await getOverview(userId)
    if (isRunning(row)) return toOverviewDto(row)
    return start(userId)
  })
}

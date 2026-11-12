import type { NotificationDto, NotificationEvent } from '@tg-analyzer/shared'
import { and, desc, eq, gt, isNotNull, isNull, lt, sql } from 'drizzle-orm'
import { db, schema } from '../../db'
import type { NotificationData, NotificationRow } from '../../db/schema'
import { logger } from '../../lib/logger'
import { addMs, DAY_MS } from '../../lib/time'
import { sendNotificationToBot } from './bot'

/**
 * «Уведомления»: one row per thing that happened to a chat's report while its owner may not have been looking —
 * a report ready, an analysis failed, a quiz answered, the report link opened by someone else, a link about to
 * expire. The same events go to the bot when the user turned it on. Rows keep the chat's name and numbers only.
 */

/** How many the page shows; older ones are still counted until the nightly cleanup. */
const LIST_LIMIT = 50
/** Kept this long, read or not. */
export const NOTIFICATION_RETENTION_DAYS = 90
/** A link is «about to expire» this long before its end. */
const EXPIRING_WITHIN_MS = 3 * DAY_MS

/** Records an event for the user (and tells the bot). Never throws: a notification must not fail its cause. */
export async function notify(userId: string, chat: { chatId: string; title: string }, event: NotificationEvent) {
  const data = { chatId: chat.chatId, title: chat.title, ...event } as NotificationData
  try {
    const report = await db.query.chatReports.findFirst({
      columns: { id: true },
      where: and(eq(schema.chatReports.userId, userId), eq(schema.chatReports.tgChatId, Number(chat.chatId))),
    })
    await db.insert(schema.notifications).values({ userId, reportId: report?.id ?? null, kind: event.kind, data })
  } catch (error) {
    logger.warn({ err: error, userId, kind: event.kind }, 'could not record a notification')
  }
  await sendNotificationToBot(userId, data)
}

function toDto(row: NotificationRow): NotificationDto {
  return { ...row.data, id: row.id, createdAt: row.createdAt.toISOString(), read: row.readAt !== null }
}

export async function listNotifications(userId: string) {
  const rows = await db
    .select()
    .from(schema.notifications)
    .where(eq(schema.notifications.userId, userId))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(LIST_LIMIT)
  return { notifications: rows.map(toDto), unread: await unreadCount(userId) }
}

export async function unreadCount(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.notifications)
    .where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt)))
  return row?.count ?? 0
}

/** Opening the page reads everything on it, as a notification centre does. */
export async function markAllRead(userId: string) {
  await db
    .update(schema.notifications)
    .set({ readAt: new Date() })
    .where(and(eq(schema.notifications.userId, userId), isNull(schema.notifications.readAt)))
}

/** Nightly: links that end within three days get one notice each. */
export async function notifyExpiringLinks(now = new Date()) {
  const links = await db
    .select({
      id: schema.shareLinks.id,
      userId: schema.shareLinks.userId,
      kind: schema.shareLinks.kind,
      expiresAt: schema.shareLinks.expiresAt,
      chatId: schema.chatReports.tgChatId,
      title: schema.chatReports.title,
    })
    .from(schema.shareLinks)
    .innerJoin(schema.chatReports, eq(schema.chatReports.id, schema.shareLinks.reportId))
    .where(
      and(
        isNotNull(schema.shareLinks.expiresAt),
        gt(schema.shareLinks.expiresAt, now),
        lt(schema.shareLinks.expiresAt, addMs(now, EXPIRING_WITHIN_MS)),
      ),
    )
  for (const link of links) {
    const expiresAt = link.expiresAt!.toISOString()
    // One notice per link and end date: a link extended later can warn again.
    const known = await db
      .select({ id: schema.notifications.id })
      .from(schema.notifications)
      .where(
        and(
          eq(schema.notifications.userId, link.userId),
          eq(schema.notifications.kind, 'link_expiring'),
          sql`${schema.notifications.data}->>'chatId' = ${String(link.chatId)}`,
          sql`${schema.notifications.data}->>'link' = ${link.kind}`,
          sql`${schema.notifications.data}->>'expiresAt' = ${expiresAt}`,
        ),
      )
      .limit(1)
    if (known.length) continue
    await notify(
      link.userId,
      { chatId: String(link.chatId), title: link.title },
      { kind: 'link_expiring', link: link.kind, expiresAt },
    )
  }
}

export async function deleteOldNotifications(now = new Date()) {
  await db
    .delete(schema.notifications)
    .where(lt(schema.notifications.createdAt, addMs(now, -NOTIFICATION_RETENTION_DAYS * DAY_MS)))
}

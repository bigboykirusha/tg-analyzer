import { and, eq, inArray } from 'drizzle-orm'
import webpush from 'web-push'
import { config } from '../../config'
import { db, schema } from '../../db'
import type { NotificationData, PushSubscriptionRow } from '../../db/schema'
import { logger } from '../../lib/logger'

/**
 * Web push: the person's own news — a report ready, an analysis failed, a quiz answered, a link opened or about to
 * end — arrives on every browser where they allowed notifications, the same lines as «Уведомления» (14.11: the bot
 * no longer carries them). The browser's push service only relays an encrypted payload; we keep its address and keys.
 * Off without VAPID keys.
 */

export function pushEnabled() {
  return Boolean(config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY && config.VAPID_SUBJECT)
}

export function pushPublicKey() {
  return pushEnabled() ? config.VAPID_PUBLIC_KEY! : null
}

export type PushLocale = 'ru' | 'en'

/** What the service worker shows: the page's bold line as the title, «Мама · 5 из 5» under it, and where a tap leads. */
export interface PushPayload {
  title: string
  body: string
  url: string
  /** One notification per chat and kind: a newer one replaces the older on the lock screen. */
  tag: string
}

const TEXT = {
  ru: {
    report_ready: 'Отчёт готов',
    analysis_failed: 'Разбор не получился',
    quiz_answered: 'Угадайку прошли',
    link_opened: 'Ссылку на отчёт открыли',
    link_expiring: 'Ссылка скоро перестанет работать',
    quiz_expiring: 'Угадайка скоро перестанет работать',
    failed: 'Попробуйте ещё раз',
    hidden: 'Счёт скрыт',
    score: (score: number, total: number) => `${score} из ${total}`,
    until: 'До',
    messages: (count: number) => {
      const n = Math.abs(count) % 100
      const last = n % 10
      const word =
        n > 10 && n < 20 ? 'сообщений' : last === 1 ? 'сообщение' : last >= 2 && last <= 4 ? 'сообщения' : 'сообщений'
      return `${count.toLocaleString('ru-RU')} ${word}`
    },
  },
  en: {
    report_ready: 'Report ready',
    analysis_failed: 'The analysis did not go through',
    quiz_answered: 'Quiz answered',
    link_opened: 'Your report link was opened',
    link_expiring: 'The report link ends soon',
    quiz_expiring: 'The quiz link ends soon',
    failed: 'Try again',
    hidden: 'Score hidden',
    score: (score: number, total: number) => `${score} of ${total}`,
    until: 'Until',
    messages: (count: number) => `${count.toLocaleString('en-US')} ${count === 1 ? 'message' : 'messages'}`,
  },
}

export function pushPayload(event: NotificationData, locale: PushLocale): PushPayload {
  const text = TEXT[locale]
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long' })
  const [title, more] = (() => {
    switch (event.kind) {
      case 'report_ready':
        return [text.report_ready, text.messages(event.messages)]
      case 'analysis_failed':
        return [text.analysis_failed, text.failed]
      case 'quiz_answered':
        return [text.quiz_answered, event.score === null ? text.hidden : text.score(event.score, event.total)]
      case 'link_opened':
        return [text.link_opened, '']
      case 'link_expiring':
        return [
          event.link === 'quiz' ? text.quiz_expiring : text.link_expiring,
          `${text.until} ${date(event.expiresAt)}`,
        ]
    }
  })()
  // News about a link or the quiz opens the report's «Поделиться», as the row in «Уведомления» does.
  const share = event.kind === 'quiz_answered' || event.kind === 'link_opened' || event.kind === 'link_expiring'
  return {
    title,
    body: more ? `${event.title} · ${more}` : event.title,
    url: `/chat/${event.chatId}${share ? '?share' : ''}`,
    tag: `${event.kind}:${event.chatId}`,
  }
}

/** Sends one push; replaced in tests. Resolves to the push service's status code. */
export type PushSender = (subscription: PushSubscriptionRow, payload: string) => Promise<number>

const webPushSender: PushSender = async (subscription, payload) => {
  const result = await webpush.sendNotification(
    { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
    payload,
    {
      vapidDetails: {
        subject: config.VAPID_SUBJECT!,
        publicKey: config.VAPID_PUBLIC_KEY!,
        privateKey: config.VAPID_PRIVATE_KEY!,
      },
      // News a day late is no longer news.
      TTL: 24 * 60 * 60,
      timeout: 10_000,
    },
  )
  return result.statusCode
}

let sender: PushSender = webPushSender

/** Tests swap the push service for a recorder; `null` puts the real one back. */
export function setPushSender(next: PushSender | null) {
  sender = next ?? webPushSender
}

/** Allowed on this browser: the address belongs to this user from now on (a shared computer's last account). */
export async function savePushSubscription(
  userId: string,
  subscription: { endpoint: string; p256dh: string; auth: string; locale: PushLocale },
) {
  await db
    .insert(schema.pushSubscriptions)
    .values({ userId, ...subscription })
    .onConflictDoUpdate({
      target: schema.pushSubscriptions.endpoint,
      set: { userId, p256dh: subscription.p256dh, auth: subscription.auth, locale: subscription.locale },
    })
}

export async function deletePushSubscription(userId: string, endpoint: string) {
  await db
    .delete(schema.pushSubscriptions)
    .where(and(eq(schema.pushSubscriptions.userId, userId), eq(schema.pushSubscriptions.endpoint, endpoint)))
}

/** The event to every browser of the user; never throws. Addresses the push service forgot are removed. */
export async function sendPush(userId: string, event: NotificationData) {
  if (!pushEnabled()) return
  try {
    const subscriptions = await db
      .select()
      .from(schema.pushSubscriptions)
      .where(eq(schema.pushSubscriptions.userId, userId))
    const gone: string[] = []
    await Promise.all(
      subscriptions.map(async (subscription) => {
        const payload = JSON.stringify(pushPayload(event, subscription.locale === 'en' ? 'en' : 'ru'))
        try {
          await sender(subscription, payload)
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode
          // 404/410: the browser unsubscribed or the person cleared the site's data.
          if (status === 404 || status === 410) gone.push(subscription.id)
          else logger.warn({ err: error, userId, status }, 'could not send a push')
        }
      }),
    )
    if (gone.length) await db.delete(schema.pushSubscriptions).where(inArray(schema.pushSubscriptions.id, gone))
  } catch (error) {
    logger.warn({ err: error, userId, kind: event.kind }, 'could not send pushes')
  }
}

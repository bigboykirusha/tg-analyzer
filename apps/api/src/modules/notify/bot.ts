import { eq } from 'drizzle-orm'
import { config } from '../../config'
import { db, schema } from '../../db'
import type { NotificationData } from '../../db/schema'
import { logger } from '../../lib/logger'
import { redis } from '../../lib/redis'
import { alertsEnabled, sendFeedback } from '../system/alerts'
import { sleep } from '../../lib/time'

/**
 * Our own Telegram bot repeats the important lines of «Уведомления» — a report ready, an analysis failed, how a
 * friend did in «Угадайка» — once the user has pressed Start in it. The bot learns who they are from Telegram itself: the sender
 * of /start is the same Telegram account they signed in with, so no codes or
 * links to match. /stop turns it off. Off entirely without TELEGRAM_BOT_TOKEN.
 */

const API = 'https://api.telegram.org'
/** Long polling: Telegram holds the request open this long when nothing happens. */
const POLL_SECONDS = 25
/** Only one worker polls; the others would get 409 Conflict from Telegram. */
const POLLER_LOCK = 'bot:poller'
const POLLER_LOCK_MS = 60_000
const OFFSET_KEY = 'bot:offset'

export function botEnabled() {
  return Boolean(config.TELEGRAM_BOT_TOKEN)
}

/** Where «Подключить» leads: the bot with the Start button. */
/** «Сообщить о проблеме»: the bot's Start link for a report; null without the bot or a place to deliver it. */
export function botFeedbackUrl() {
  return botEnabled() && config.TELEGRAM_BOT_USERNAME && alertsEnabled()
    ? `https://t.me/${config.TELEGRAM_BOT_USERNAME}?start=feedback`
    : null
}

export function botUrl() {
  return botEnabled() && config.TELEGRAM_BOT_USERNAME
    ? `https://t.me/${config.TELEGRAM_BOT_USERNAME}?start=notify`
    : null
}

/** The app's public address, for buttons in bot messages. */
function siteUrl() {
  return (config.APP_URL ?? config.ALLOWED_ORIGINS.find((origin) => origin !== '*') ?? '').replace(/\/$/, '')
}

interface BotUpdate {
  update_id: number
  message?: { chat: { id: number; type: string }; from?: { id: number; username?: string }; text?: string }
}

async function call<T>(method: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API}/bot${config.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  const json = (await response.json()) as { ok: boolean; result?: T; description?: string }
  if (!json.ok) throw new Error(`Bot API ${method}: ${json.description ?? response.status}`)
  return json.result as T
}

export async function sendBotMessage(chatId: number, text: string, button?: { text: string; url: string }) {
  await call('sendMessage', {
    chat_id: chatId,
    text,
    link_preview_options: { is_disabled: true },
    ...(button ? { reply_markup: { inline_keyboard: [[button]] } } : {}),
  })
}

/** What the bot says for an event; only these three are worth a message, the rest wait on the page. */
function botText(event: NotificationData): string | null {
  switch (event.kind) {
    case 'report_ready':
      return `Отчёт по чату «${event.title}» готов: ${event.messages.toLocaleString('ru-RU')} сообщений.`
    case 'analysis_failed':
      return `Не получилось разобрать чат «${event.title}». Попробуйте ещё раз с сайта.`
    case 'quiz_answered':
      // The guest decides whether the score is shown; the bot keeps that choice as the page does.
      return event.score === null
        ? `Угадайку по чату «${event.title}» прошли, счёт решили не показывать.`
        : `Угадайку по чату «${event.title}» прошли: ${event.score} из ${event.total}.`
    default:
      return null
  }
}

/** The event to a user who pressed Start in the bot; never throws. */
export async function sendNotificationToBot(userId: string, event: NotificationData) {
  if (!botEnabled()) return
  const text = botText(event)
  if (!text) return
  try {
    const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) })
    if (!user?.botNotify) return
    const site = siteUrl()
    await sendBotMessage(
      user.tgUserId,
      text,
      site ? { text: 'Открыть', url: `${site}/chat/${event.chatId}` } : undefined,
    )
  } catch (error) {
    logger.warn({ err: error, userId, kind: event.kind }, 'could not send a bot message')
  }
}

async function setNotify(tgUserId: number, on: boolean) {
  const rows = await db
    .update(schema.users)
    .set({ botNotify: on })
    .where(eq(schema.users.tgUserId, tgUserId))
    .returning({ id: schema.users.id })
  return rows.length > 0
}

export async function handleBotUpdate(update: BotUpdate) {
  const message = update.message
  const from = message?.from?.id
  if (!message || !from || message.chat.type !== 'private') return
  const text = (message.text ?? '').trim()
  const [command, payload] = text.split(/\s+/).map((part) => part.split('@')[0]!.toLowerCase())
  const site = siteUrl()
  if (command === '/start' && payload === 'feedback') {
    await sendBotMessage(
      message.chat.id,
      'Опишите, что случилось, одним сообщением: на каком экране и что вы ждали увидеть. Я передам разработчику.',
    )
  } else if (text && !text.startsWith('/')) {
    // Anything that is not a command is a message for the developer: the bot has nothing else to say.
    const who = message.from?.username ? `@${message.from.username}` : `id ${from}`
    const sent = await sendFeedback(`Сообщение о проблеме от ${who}:\n${text.slice(0, 3500)}`)
    await sendBotMessage(
      message.chat.id,
      sent ? 'Спасибо, сообщение передано разработчику.' : 'Я понимаю только /start и /stop.',
    )
  } else if (command === '/start') {
    const known = await setNotify(from, true)
    await sendBotMessage(
      message.chat.id,
      known
        ? 'Готово: напишу сюда, когда отчёт будет готов. Отключить — /stop.'
        : 'Сначала войдите на сайте через Telegram, потом снова нажмите Start.',
      site
        ? { text: known ? 'Открыть TG Analyzer' : 'Войти', url: known ? `${site}/dashboard` : `${site}/login` }
        : undefined,
    )
  } else if (command === '/stop') {
    await setNotify(from, false)
    await sendBotMessage(message.chat.id, 'Больше не пишу. Включить снова — /start.')
  }
}

/** Polls the bot for /start and /stop while the worker runs. Returns a stop function. */
export function startBotPolling() {
  if (!botEnabled()) return async () => undefined
  const controller = new AbortController()
  const owner = `${process.pid}-${Math.random().toString(36).slice(2)}`

  const loop = async () => {
    while (!controller.signal.aborted) {
      try {
        const held = await redis.set(POLLER_LOCK, owner, 'PX', POLLER_LOCK_MS, 'NX')
        if (!held && (await redis.get(POLLER_LOCK)) !== owner) {
          await sleep(POLLER_LOCK_MS / 2)
          continue
        }
        await redis.pexpire(POLLER_LOCK, POLLER_LOCK_MS)
        const offset = Number(await redis.get(OFFSET_KEY)) || 0
        const updates = await call<BotUpdate[]>(
          'getUpdates',
          { offset, timeout: POLL_SECONDS, allowed_updates: ['message'] },
          controller.signal,
        )
        for (const update of updates) {
          await handleBotUpdate(update).catch((error) => logger.warn({ err: error }, 'bot update failed'))
          await redis.set(OFFSET_KEY, String(update.update_id + 1))
        }
      } catch (error) {
        if (controller.signal.aborted) break
        logger.warn({ err: error }, 'bot polling failed; retrying')
        await sleep(5_000)
      }
    }
  }
  void loop()
  logger.info('bot polling started')

  return async () => {
    controller.abort()
    if ((await redis.get(POLLER_LOCK).catch(() => null)) === owner) await redis.del(POLLER_LOCK).catch(() => undefined)
  }
}

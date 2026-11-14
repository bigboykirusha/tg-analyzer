import { and, asc, gt, isNull } from 'drizzle-orm'
import { config } from '../../config'
import { db, schema } from '../../db'
import { logger } from '../../lib/logger'
import { redis } from '../../lib/redis'
import { alertsEnabled, sendFeedback } from '../system/alerts'
import { sleep } from '../../lib/time'

/**
 * Our own Telegram bot: news of TGDuet for everyone who pressed Start (signed in on the site or not) — what is new,
 * what changed — and «Сообщить о проблеме». It never carries a person's own events (those go by web push, 14.11)
 * and never signs anyone in: its buttons are plain links. /stop turns the news off. A broadcast is sent with
 * `broadcast.ts`. Off entirely without TELEGRAM_BOT_TOKEN.
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

/** «Сообщить о проблеме»: the bot's Start link for a report; null without the bot or a place to deliver it. */
export function botFeedbackUrl() {
  return botEnabled() && config.TELEGRAM_BOT_USERNAME && alertsEnabled()
    ? `https://t.me/${config.TELEGRAM_BOT_USERNAME}?start=feedback`
    : null
}

/** Where «Подписаться» leads: the bot with the Start button. */
export function botUrl() {
  return botEnabled() && config.TELEGRAM_BOT_USERNAME ? `https://t.me/${config.TELEGRAM_BOT_USERNAME}?start=news` : null
}

/** The app's public address, for buttons in bot messages. */
function siteUrl() {
  return (config.APP_URL ?? config.ALLOWED_ORIGINS.find((origin) => origin !== '*') ?? '').replace(/\/$/, '')
}

interface BotUpdate {
  update_id: number
  message?: { chat: { id: number; type: string }; from?: { id: number; username?: string }; text?: string }
}

export async function call<T>(method: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API}/bot${config.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  const json = (await response.json()) as {
    ok: boolean
    result?: T
    description?: string
    error_code?: number
    parameters?: { retry_after?: number }
  }
  if (!json.ok) throw new BotApiError(method, json.description ?? String(response.status), json)
  return json.result as T
}

/** A refusal from the Bot API: 403 — the person blocked the bot; 429 — wait `retryAfter` seconds. */
export class BotApiError extends Error {
  readonly code: number | undefined
  readonly retryAfter: number | undefined
  constructor(
    method: string,
    description: string,
    json: { error_code?: number; parameters?: { retry_after?: number } },
  ) {
    super(`Bot API ${method}: ${description}`)
    this.code = json.error_code
    this.retryAfter = json.parameters?.retry_after
  }
}

/** A button under a message: a plain link to the site (never a sign-in). */
type BotButton = { text: string; url: string }

export async function sendBotMessage(chatId: number, text: string, button?: BotButton) {
  return call('sendMessage', {
    chat_id: chatId,
    text,
    link_preview_options: { is_disabled: true },
    ...(button ? { reply_markup: { inline_keyboard: [[button]] } } : {}),
  })
}

/** Start subscribes to the news, /stop (or blocking the bot) unsubscribes. */
export async function setBotSubscribed(chatId: number, on: boolean) {
  await db
    .insert(schema.botSubscribers)
    .values({ chatId, stoppedAt: on ? null : new Date() })
    .onConflictDoUpdate({
      target: schema.botSubscribers.chatId,
      set: on ? { startedAt: new Date(), stoppedAt: null } : { stoppedAt: new Date() },
    })
}

/** Everyone subscribed, in pages (a broadcast walks them by chat id). */
export function botSubscribersAfter(chatId: number, limit: number) {
  return db
    .select({ chatId: schema.botSubscribers.chatId })
    .from(schema.botSubscribers)
    .where(and(isNull(schema.botSubscribers.stoppedAt), gt(schema.botSubscribers.chatId, chatId)))
    .orderBy(asc(schema.botSubscribers.chatId))
    .limit(limit)
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
    await setBotSubscribed(message.chat.id, true)
    await sendBotMessage(
      message.chat.id,
      'Это бот TGDuet. Здесь будут новости сервиса: что появилось и что изменилось — нечасто. Уведомления о ваших отчётах приходят на сайте и пушем, если вы их включили. Отписаться — /stop.',
      site ? { text: 'Открыть TGDuet', url: `${site}/dashboard` } : undefined,
    )
  } else if (command === '/stop') {
    await setBotSubscribed(message.chat.id, false)
    await sendBotMessage(message.chat.id, 'Больше не пишу. Подписаться снова — /start.')
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

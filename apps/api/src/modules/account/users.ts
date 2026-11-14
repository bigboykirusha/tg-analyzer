import type { UserDto } from '@tg-analyzer/shared'
import { and, eq, isNull } from 'drizzle-orm'
import { db, schema } from '../../db'
import type { UserRow } from '../../db/schema'
import type { TelegramUser } from '../../telegram'
import { botFeedbackUrl, botUrl, setBotSubscribed } from '../notify/bot'
import { hasActiveTelegramSession } from './telegram-sessions'

export async function upsertTelegramUser(user: TelegramUser, phone: string): Promise<UserRow> {
  const values = {
    tgUserId: Number(user.id),
    tgPhone: phone,
    username: user.username,
    firstName: user.firstName,
    lastLogin: new Date(),
  }
  const [row] = await db
    .insert(schema.users)
    .values(values)
    .onConflictDoUpdate({ target: schema.users.tgUserId, set: values })
    .returning()
  if (!row) throw new Error('User persistence failed')
  return row
}

export function findUser(userId: string) {
  return db.query.users.findFirst({ where: eq(schema.users.id, userId) })
}

export async function updateUserSettings(userId: string, settings: { timezone?: string; botNotify?: false }) {
  const { botNotify, ...columns } = settings
  const [row] = Object.keys(columns).length
    ? await db.update(schema.users).set(columns).where(eq(schema.users.id, userId)).returning()
    : await db.select().from(schema.users).where(eq(schema.users.id, userId))
  // The bot's news, turned off from the site: the same as /stop in the bot.
  if (row && botNotify === false) await setBotSubscribed(row.tgUserId, false)
  return row ?? null
}

/** Subscribed to the bot's news: a private chat with the bot has the person's own Telegram id. */
async function subscribedToBot(tgUserId: number) {
  const row = await db.query.botSubscribers.findFirst({
    columns: { chatId: true },
    where: and(eq(schema.botSubscribers.chatId, tgUserId), isNull(schema.botSubscribers.stoppedAt)),
  })
  return Boolean(row)
}

export async function toUserDto(user: UserRow, telegramSessionActive?: boolean): Promise<UserDto> {
  return {
    id: user.id,
    tgUserId: String(user.tgUserId),
    username: user.username,
    firstName: user.firstName,
    timezone: user.timezone,
    botNotify: await subscribedToBot(user.tgUserId),
    botUrl: botUrl(),
    feedbackUrl: botFeedbackUrl(),
    telegramSessionActive: telegramSessionActive ?? (await hasActiveTelegramSession(user.id)),
  }
}

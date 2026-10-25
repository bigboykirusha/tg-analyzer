import type { UserDto } from '@tg-analyzer/shared'
import { eq } from 'drizzle-orm'
import { db, schema } from '../../db'
import type { UserRow } from '../../db/schema'
import type { TelegramUser } from '../../telegram'
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

export async function updateUserSettings(
  userId: string,
  settings: { timezone?: string; disconnectAfterAnalysis?: boolean },
) {
  const [row] = await db.update(schema.users).set(settings).where(eq(schema.users.id, userId)).returning()
  return row ?? null
}

export async function toUserDto(user: UserRow, telegramSessionActive?: boolean): Promise<UserDto> {
  return {
    id: user.id,
    tgUserId: String(user.tgUserId),
    username: user.username,
    firstName: user.firstName,
    timezone: user.timezone,
    disconnectAfterAnalysis: user.disconnectAfterAnalysis,
    telegramSessionActive: telegramSessionActive ?? (await hasActiveTelegramSession(user.id)),
  }
}

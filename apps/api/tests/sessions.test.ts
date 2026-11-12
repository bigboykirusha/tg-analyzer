import test from 'node:test'
import assert from 'node:assert/strict'
import { eq } from 'drizzle-orm'
import * as schema from '../src/db/schema'
import { db, login, useTestServer } from './helpers'

useTestServer()

const { endIdleTelegramSessions } = await import('../src/modules/account/telegram-sessions')
const DAY_MS = 86_400_000

test('a Telegram session idle for two months is ended, an active one stays', async () => {
  const idle = await login('+79990000201')
  const active = await login('+79990000202')
  // The idle one last visited 70 days ago: its newest sign-in runs out in 20 days instead of 90.
  await db
    .update(schema.refreshSessions)
    .set({ expiresAt: new Date(Date.now() + 20 * DAY_MS) })
    .where(eq(schema.refreshSessions.userId, idle.userId))

  assert.equal(await endIdleTelegramSessions(), 1)
  const left = await db.select({ userId: schema.telegramSessions.userId }).from(schema.telegramSessions)
  assert.ok(!left.some((row) => row.userId === idle.userId))
  assert.ok(left.some((row) => row.userId === active.userId))
  // Their reports and account stay: only the Telegram authorization is gone.
  assert.equal((await db.select().from(schema.users).where(eq(schema.users.id, idle.userId))).length, 1)
})

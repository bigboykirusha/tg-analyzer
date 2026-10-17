import type { ContactStatsDto, PeopleOverviewDto } from '@tg-analyzer/shared'
import { eq } from 'drizzle-orm'
import { db, schema } from '../../db'

type OverviewRow = typeof schema.peopleOverviews.$inferSelect

export async function getOverview(userId: string): Promise<OverviewRow | null> {
  const row = await db.query.peopleOverviews.findFirst({ where: eq(schema.peopleOverviews.userId, userId) })
  return row ?? null
}

/** Starts (or restarts) a run. Previous contacts stay visible until the new run finishes. */
export async function markRunning(userId: string, totalChats = 0) {
  const values = { status: 'running' as const, scannedChats: 0, totalChats, updatedAt: new Date() }
  await db
    .insert(schema.peopleOverviews)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: schema.peopleOverviews.userId, set: values })
}

export async function saveProgress(userId: string, scannedChats: number) {
  await db
    .update(schema.peopleOverviews)
    .set({ scannedChats, updatedAt: new Date() })
    .where(eq(schema.peopleOverviews.userId, userId))
}

export async function saveContacts(userId: string, contacts: ContactStatsDto[]) {
  const now = new Date()
  await db
    .update(schema.peopleOverviews)
    .set({
      status: 'ready',
      contacts,
      scannedChats: contacts.length,
      totalChats: contacts.length,
      computedAt: now,
      updatedAt: now,
    })
    .where(eq(schema.peopleOverviews.userId, userId))
}

export async function markFailed(userId: string) {
  await db
    .update(schema.peopleOverviews)
    .set({ status: 'failed', updatedAt: new Date() })
    .where(eq(schema.peopleOverviews.userId, userId))
}

export function toOverviewDto(row: OverviewRow | null): PeopleOverviewDto {
  if (!row) return { status: 'empty', computedAt: null, scannedChats: 0, totalChats: 0, contacts: [] }
  return {
    status: row.status,
    computedAt: row.computedAt?.toISOString() ?? null,
    scannedChats: row.scannedChats,
    totalChats: row.totalChats,
    contacts: row.contacts,
  }
}

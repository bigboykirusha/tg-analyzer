import type { JobStatus, ParseErrorCode, ParseJobDto } from '@tg-analyzer/shared'
import { and, count, desc, eq, inArray, lt, notInArray, sql } from 'drizzle-orm'
import { db, schema } from '../../db'
import type { ParseJobRow } from '../../db/schema'

const ACTIVE: JobStatus[] = ['pending', 'running']
const KNOWN_ERRORS = new Set<ParseErrorCode>([
  'telegram_session_expired',
  'telegram_busy',
  'chat_unavailable',
  'interrupted',
  'internal',
])

function isUniqueViolation(error: unknown) {
  return (
    (error as { code?: string; cause?: { code?: string } })?.code === '23505' ||
    (error as { cause?: { code?: string } })?.cause?.code === '23505'
  )
}

/** Reserves the user's single active job slot. Returns null when another job is active. */
export async function createJob(input: { userId: string; chatId: string; chatTitle: string | null }) {
  try {
    const [job] = await db
      .insert(schema.parseJobs)
      .values({ userId: input.userId, chatId: Number(input.chatId), chatTitle: input.chatTitle, status: 'pending' })
      .returning()
    return job ?? null
  } catch (error) {
    if (isUniqueViolation(error)) return null
    throw error
  }
}

export function findJob(jobId: string) {
  return db.query.parseJobs.findFirst({ where: eq(schema.parseJobs.id, jobId) })
}

export function findActiveJob(userId: string) {
  return db.query.parseJobs.findFirst({
    where: and(eq(schema.parseJobs.userId, userId), inArray(schema.parseJobs.status, ACTIVE)),
  })
}

export function listActiveJobs() {
  return db.query.parseJobs.findMany({ where: inArray(schema.parseJobs.status, ACTIVE) })
}

/** Moves a pending (or retried) job to running. Returns null if it was cancelled or deleted meanwhile. */
export async function markJobRunning(jobId: string) {
  const [job] = await db
    .update(schema.parseJobs)
    .set({ status: 'running', startedAt: sql`COALESCE(${schema.parseJobs.startedAt}, now())`, errorCode: null })
    .where(and(eq(schema.parseJobs.id, jobId), inArray(schema.parseJobs.status, ACTIVE)))
    .returning()
  return job ?? null
}

export async function setJobChatTitle(jobId: string, chatTitle: string) {
  await db.update(schema.parseJobs).set({ chatTitle }).where(eq(schema.parseJobs.id, jobId))
}

export async function isJobActive(jobId: string) {
  const job = await db.query.parseJobs.findFirst({
    columns: { status: true },
    where: eq(schema.parseJobs.id, jobId),
  })
  return job !== undefined && ACTIVE.includes(job.status)
}

export async function failJob(jobId: string, errorCode: ParseErrorCode) {
  await db
    .update(schema.parseJobs)
    .set({ status: 'failed', errorCode, completedAt: new Date() })
    .where(and(eq(schema.parseJobs.id, jobId), inArray(schema.parseJobs.status, ACTIVE)))
}

export async function cancelActiveJob(userId: string) {
  const [job] = await db
    .update(schema.parseJobs)
    .set({ status: 'cancelled', completedAt: new Date() })
    .where(and(eq(schema.parseJobs.userId, userId), inArray(schema.parseJobs.status, ACTIVE)))
    .returning()
  return job ?? null
}

export async function listJobs(userId: string, page: number, limit: number) {
  const where = eq(schema.parseJobs.userId, userId)
  const [items, [total]] = await Promise.all([
    db.query.parseJobs.findMany({
      where,
      orderBy: [desc(schema.parseJobs.createdAt)],
      limit,
      offset: (page - 1) * limit,
    }),
    db.select({ value: count() }).from(schema.parseJobs).where(where),
  ])
  return { items, total: total?.value ?? 0 }
}

export async function deleteFinishedJobs(userId: string) {
  const deleted = await db
    .delete(schema.parseJobs)
    .where(and(eq(schema.parseJobs.userId, userId), notInArray(schema.parseJobs.status, ACTIVE)))
    .returning({ id: schema.parseJobs.id })
  return deleted.length
}

export type DeleteJobResult = 'deleted' | 'not_found' | 'active'

export async function deleteFinishedJob(userId: string, jobId: string): Promise<DeleteJobResult> {
  const job = await findJob(jobId)
  if (!job || job.userId !== userId) return 'not_found'
  if (ACTIVE.includes(job.status)) return 'active'
  await db.delete(schema.parseJobs).where(and(eq(schema.parseJobs.id, jobId), eq(schema.parseJobs.userId, userId)))
  return 'deleted'
}

export async function deleteJobsOlderThan(threshold: Date) {
  await db
    .delete(schema.parseJobs)
    .where(and(lt(schema.parseJobs.createdAt, threshold), notInArray(schema.parseJobs.status, ACTIVE)))
}

export function toJobDto(job: ParseJobRow): ParseJobDto {
  return {
    jobId: job.id,
    chatId: job.chatId === null ? null : String(job.chatId),
    chatTitle: job.chatTitle,
    status: job.status,
    totalMessages: job.totalMessages,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    error:
      job.status === 'failed'
        ? KNOWN_ERRORS.has(job.errorCode as ParseErrorCode)
          ? (job.errorCode as ParseErrorCode)
          : 'internal'
        : null,
  }
}

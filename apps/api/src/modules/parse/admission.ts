import { and, asc, eq, gt, inArray, lt } from 'drizzle-orm'
import { db, schema } from '../../db'
import { ApiError, conflict, notFound } from '../../lib/errors'
import { DAY_MS } from '../../lib/time'

/** Reserve quota and a queue slot together, including across API instances. */
export function admitAnalysis(
  input: { userId: string; chatId: string; chatTitle: string | null },
  limits: { daily: number; queued: number },
) {
  return db.transaction(async (tx) => {
    // All starts for this user serialize on the same durable row.
    const [user] = await tx
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.id, input.userId))
      .for('update')
    if (!user) throw notFound()

    if (limits.daily) {
      const recent = await tx
        .select({ createdAt: schema.analysisUsage.createdAt })
        .from(schema.analysisUsage)
        .where(
          and(
            eq(schema.analysisUsage.userId, input.userId),
            gt(schema.analysisUsage.createdAt, new Date(Date.now() - DAY_MS)),
          ),
        )
        .orderBy(asc(schema.analysisUsage.createdAt))
        .limit(limits.daily)
      if (recent.length >= limits.daily) {
        const wait = Math.ceil((recent[0]!.createdAt.getTime() + DAY_MS - Date.now()) / 1000)
        throw new ApiError(429, 'PARSE_DAILY_LIMIT', 'The free daily limit of analyses is used up', Math.max(wait, 60))
      }
    }

    const waiting = await tx
      .select({ id: schema.parseJobs.id })
      .from(schema.parseJobs)
      .where(and(eq(schema.parseJobs.userId, input.userId), inArray(schema.parseJobs.status, ['pending', 'running'])))
    if (waiting.length >= limits.queued)
      throw conflict('PARSE_QUEUE_FULL', 'Too many analyses are waiting; let some finish first')

    const [job] = await tx
      .insert(schema.parseJobs)
      .values({
        userId: input.userId,
        chatId: Number(input.chatId),
        chatTitle: input.chatTitle,
        status: 'pending',
      })
      .onConflictDoNothing()
      .returning()
    if (!job) throw conflict('PARSE_ALREADY_QUEUED', 'This chat is already being analysed or waiting')
    await tx.insert(schema.analysisUsage).values({ userId: input.userId, createdAt: job.createdAt })
    return { job, first: waiting.length === 0 }
  })
}

/** Quota contains no chat data and is needed only for the rolling 24-hour window. */
export async function deleteExpiredAnalysisUsage() {
  await db.delete(schema.analysisUsage).where(lt(schema.analysisUsage.createdAt, new Date(Date.now() - DAY_MS)))
}

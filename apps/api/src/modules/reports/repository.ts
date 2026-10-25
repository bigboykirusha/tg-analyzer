import {
  CHAT_REPORT_VERSION,
  deriveReportMetrics,
  emptySessionStats,
  resolveGroupRole,
  type ChatReport,
  type ChatType,
  type DatedActivityDto,
  type GroupReportDto,
  type ReportDto,
  type ReportSummaryDto,
  type ResponseStatsDto,
  reportHeadline,
  snapshotReport,
  weeklyPulse,
  withoutStopWords,
  type DirectionalTopItemsDto,
} from '@tg-analyzer/shared'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { db, schema } from '../../db'
import type { ChatReportRow } from '../../db/schema'

const EMPTY_RESPONSES: ResponseStatsDto = {
  medianMineSec: null,
  medianTheirsSec: null,
  mineSamples: 0,
  theirsSamples: 0,
  mineP25Sec: null,
  mineP75Sec: null,
  mineP95Sec: null,
  theirsP25Sec: null,
  theirsP75Sec: null,
  theirsP95Sec: null,
  responseRate: null,
  iWriteFirstPct: null,
}

type SummaryRow = Pick<
  ChatReportRow,
  'tgChatId' | 'title' | 'chatType' | 'totalMessages' | 'firstMessageAt' | 'lastMessageAt' | 'analyzedAt'
>
/** The parts of the stored report a summary reads; older reports may miss any of them. */
type SummaryReportParts = {
  daily: DatedActivityDto[] | null
  totals: Partial<ChatReport['totals']> | null
  responses: Partial<ResponseStatsDto> | null
}

function toSummary(row: SummaryRow, parts: SummaryReportParts): ReportSummaryDto {
  const totals = { messages: 0, sent: 0, received: 0, chars: 0, words: 0, textMessages: 0, ...parts.totals }
  return {
    chatId: String(row.tgChatId),
    title: row.title,
    type: row.chatType,
    totalMessages: row.totalMessages,
    firstMessageAt: row.firstMessageAt?.toISOString() ?? null,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    analyzedAt: row.analyzedAt.toISOString(),
    pulse: weeklyPulse(Array.isArray(parts.daily) ? parts.daily : []),
    headline: reportHeadline({ totals, responses: { ...EMPTY_RESPONSES, ...parts.responses } }),
  }
}

export async function listReportSummaries(userId: string): Promise<ReportSummaryDto[]> {
  const report = schema.chatReports.report
  // Only the slices a summary needs leave the database, not the whole document.
  const rows = await db
    .select({
      tgChatId: schema.chatReports.tgChatId,
      title: schema.chatReports.title,
      chatType: schema.chatReports.chatType,
      totalMessages: schema.chatReports.totalMessages,
      firstMessageAt: schema.chatReports.firstMessageAt,
      lastMessageAt: schema.chatReports.lastMessageAt,
      analyzedAt: schema.chatReports.analyzedAt,
      daily: sql<DatedActivityDto[] | null>`${report}->'activity'->'daily'`,
      totals: sql<Partial<ChatReport['totals']> | null>`${report}->'totals'`,
      responses: sql<Partial<ResponseStatsDto> | null>`${report}->'responses'`,
    })
    .from(schema.chatReports)
    .where(eq(schema.chatReports.userId, userId))
    .orderBy(desc(schema.chatReports.analyzedAt))
  return rows.map((row) => toSummary(row, row))
}

export async function getReport(userId: string, chatId: string): Promise<ReportDto | null> {
  const row = await db.query.chatReports.findFirst({
    where: and(eq(schema.chatReports.userId, userId), eq(schema.chatReports.tgChatId, Number(chatId))),
  })
  if (!row) return null

  const report = normalizeReport(row.report, row)
  return {
    summary: toSummary(row, { daily: report.activity.daily, totals: report.totals, responses: report.responses }),
    report,
    derived: deriveReportMetrics(report),
    previous: row.previousSnapshot ?? null,
  }
}

export async function deleteReport(userId: string, chatId: string) {
  const deleted = await db
    .delete(schema.chatReports)
    .where(and(eq(schema.chatReports.userId, userId), eq(schema.chatReports.tgChatId, Number(chatId))))
    .returning({ id: schema.chatReports.id })
  return deleted.length > 0
}

/**
 * Atomically stores the report and completes the job. Returns false — and
 * stores nothing — when the job was cancelled or deleted in the meantime.
 */
export async function saveReportAndCompleteJob(input: {
  userId: string
  jobId: string
  chatId: string
  title: string
  chatType: ChatType
  report: ChatReport
}): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [job] = await tx
      .update(schema.parseJobs)
      .set({ status: 'completed', completedAt: new Date(), totalMessages: input.report.totals.messages })
      .where(and(eq(schema.parseJobs.id, input.jobId), inArray(schema.parseJobs.status, ['running'])))
      .returning({ id: schema.parseJobs.id })
    if (!job) return false

    // The report being replaced becomes the baseline for «what changed».
    const existing = await tx.query.chatReports.findFirst({
      columns: { report: true, analyzedAt: true },
      where: and(eq(schema.chatReports.userId, input.userId), eq(schema.chatReports.tgChatId, Number(input.chatId))),
    })
    const values = {
      previousSnapshot: existing ? snapshotReport(existing.report, existing.analyzedAt) : null,
      title: input.title,
      chatType: input.chatType,
      totalMessages: input.report.totals.messages,
      firstMessageAt: input.report.period.firstMessageAt ? new Date(input.report.period.firstMessageAt) : null,
      lastMessageAt: input.report.period.lastMessageAt ? new Date(input.report.period.lastMessageAt) : null,
      analyzedAt: new Date(),
      report: input.report,
    }
    await tx
      .insert(schema.chatReports)
      .values({ userId: input.userId, tgChatId: Number(input.chatId), ...values })
      .onConflictDoUpdate({ target: [schema.chatReports.userId, schema.chatReports.tgChatId], set: values })
    return true
  })
}

// ---------------------------------------------------------------------------
// Reports migrated from older versions may miss fields; fill them defensively.
// ---------------------------------------------------------------------------

function normalizeBuckets(value: unknown, size: number) {
  const source = Array.isArray(value) ? value : []
  return Array.from({ length: size }, (_, index) => {
    const bucket = source[index] as { sent?: unknown; received?: unknown; total?: unknown } | undefined
    const sent = Number(bucket?.sent) || 0
    const received = Number(bucket?.received) || 0
    return { sent, received, total: Number(bucket?.total) || sent + received }
  })
}

function normalizeGroup(group: GroupReportDto | null | undefined, asOf: number): GroupReportDto | null {
  if (!group) return null
  const health = group.health
  const completeHealth =
    health &&
    [
      health.giniCoefficient,
      health.lurkerRatio,
      health.responseCoverage,
      health.consistency,
      health.activeMembers,
      health.activeMembersLast30Days,
      health.churnedMembers,
      health.peakSimultaneity,
    ].every((value) => typeof value === 'number' && Number.isFinite(value))

  return {
    participants: (Array.isArray(group.participants) ? group.participants : []).map((participant) => ({
      ...participant,
      // Older versions stored English placeholders; the UI localises empty names.
      name: /^(you|name unavailable|unknown|profile \d+)$/i.test(participant.name ?? '')
        ? ''
        : (participant.name ?? ''),
      role: ['anchor', 'contributor', 'newcomer', 'inactive'].includes(participant.role)
        ? participant.role
        : resolveGroupRole(participant, asOf),
      topWords: withoutStopWords(participant.topWords ?? []),
      topicSignature: withoutStopWords(participant.topicSignature ?? []),
    })),
    topPairs: Array.isArray(group.topPairs) ? group.topPairs : [],
    health: completeHealth
      ? { ...health, retentionRate: health.retentionRate ?? null, momentum: health.momentum ?? 'unknown' }
      : null,
    sharedVocabulary: withoutStopWords(Array.isArray(group.sharedVocabulary) ? group.sharedVocabulary : []),
    uniqueGroupWords: withoutStopWords(Array.isArray(group.uniqueGroupWords) ? group.uniqueGroupWords : []),
  }
}

function cleanDirectional(items: DirectionalTopItemsDto): DirectionalTopItemsDto {
  return { mine: withoutStopWords(items.mine ?? []), theirs: withoutStopWords(items.theirs ?? []) }
}

function withDefaults<T extends object>(defaults: T, value: Partial<T> | null | undefined): T {
  return { ...defaults, ...value }
}

function normalizeReport(raw: ChatReport, row: ChatReportRow): ChatReport {
  const facts: Partial<ChatReport['facts']> = raw.facts ?? {}
  const sessions = withDefaults(emptySessionStats(), raw.sessions)
  const directional = { mine: [], theirs: [] }

  return {
    version: CHAT_REPORT_VERSION,
    timeZone: raw.timeZone ?? 'UTC',
    totals: withDefaults({ messages: 0, sent: 0, received: 0, chars: 0, words: 0, textMessages: 0 }, raw.totals),
    composition: withDefaults({ text: 0, media: 0, voice: 0, sticker: 0, file: 0 }, raw.composition),
    period: raw.period ?? {
      firstMessageAt: row.firstMessageAt?.toISOString() ?? null,
      lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    },
    activity: {
      hourly: normalizeBuckets(raw.activity?.hourly, 24),
      weekday: normalizeBuckets(raw.activity?.weekday, 7),
      daily: Array.isArray(raw.activity?.daily) ? raw.activity.daily : [],
      monthly: Array.isArray(raw.activity?.monthly) ? raw.activity.monthly : [],
    },
    // Stop words are filtered again on read, so older reports benefit from a longer list.
    vocabulary: {
      topWords: withoutStopWords(raw.vocabulary?.topWords ?? []),
      topWordsBySender: cleanDirectional(raw.vocabulary?.topWordsBySender ?? directional),
      uniqueWordsBySender: cleanDirectional(raw.vocabulary?.uniqueWordsBySender ?? directional),
      topEmoji: raw.vocabulary?.topEmoji ?? [],
      topEmojiBySender: raw.vocabulary?.topEmojiBySender ?? directional,
      wordsPerMessage: raw.vocabulary?.wordsPerMessage ?? { mine: null, theirs: null },
    },
    responses: withDefaults<ResponseStatsDto>(EMPTY_RESPONSES, raw.responses),
    facts: {
      activeDays: facts.activeDays ?? 0,
      longestGap: facts.longestGap ?? null,
      mostActiveDate: facts.mostActiveDate?.date ? facts.mostActiveDate : null,
      maxStreak: facts.maxStreak ?? { days: 0, startDate: null, endDate: null },
      silencesOver30Days: facts.silencesOver30Days ?? [],
      trend: facts.trend ?? 'unknown',
      mostActiveMonth: facts.mostActiveMonth ?? null,
    },
    sessions: { ...sessions, highlights: Array.isArray(sessions.highlights) ? sessions.highlights : [] },
    relationship: raw.relationship ?? null,
    health: raw.health ?? null,
    habits: raw.habits ?? null,
    group: normalizeGroup(raw.group, row.analyzedAt.getTime()),
  }
}

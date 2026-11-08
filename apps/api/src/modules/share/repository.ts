import { randomBytes } from 'node:crypto'
import {
  deriveQuiz,
  telegramHueIndex,
  type CreateShareLinkBody,
  type PublicShareDto,
  type QuizQuestionDto,
  type ReportDto,
  type ShareLinkDto,
  type ShareLinkKind,
  type ShareLinksResponse,
  type ShareReportSettings,
  type UserShareLinkDto,
} from '@tg-analyzer/shared'
import { and, desc, eq } from 'drizzle-orm'
import { db, schema } from '../../db'
import type { ShareLinkPayload, ShareLinkResult } from '../../db/schema'
import { ApiError, conflict, notFound } from '../../lib/errors'
import { getReport } from '../reports/repository'

/** Fewer clear answers than this make no game. */
export const MIN_QUIZ_QUESTIONS = 3
const DAY_MS = 86_400_000
export const DEFAULT_REPORT_SETTINGS: ShareReportSettings = { showName: false, words: false, stickers: true }

type Row = typeof schema.shareLinks.$inferSelect

const newToken = () => randomBytes(12).toString('base64url')
const linkNotFound = () => notFound('LINK_NOT_FOUND', 'Link not found')

async function reportRow(userId: string, chatId: string) {
  const row = await db.query.chatReports.findFirst({
    columns: { id: true },
    where: and(eq(schema.chatReports.userId, userId), eq(schema.chatReports.tgChatId, Number(chatId))),
  })
  if (!row) throw notFound('CHAT_NOT_FOUND', 'Report not found')
  return row
}

/**
 * The report as a stranger may see it: no Telegram ids, no message ids, the other side's name only
 * when the owner allowed it, and words, stickers and reactions only when switched on.
 */
export function publicReport(dto: ReportDto, settings: ShareReportSettings, token: string): ReportDto {
  const report = structuredClone(dto.report)
  if (!settings.words) {
    const empty = { mine: [], theirs: [] }
    report.vocabulary = {
      topWords: [],
      topWordsBySender: empty,
      uniqueWordsBySender: empty,
      topEmoji: [],
      topEmojiBySender: empty,
      wordsPerMessage: report.vocabulary.wordsPerMessage,
    }
  }
  if (!settings.stickers) {
    report.stickers = null
    report.reactions = null
  }
  report.milestones = report.milestones?.map(({ messageId: _id, ...rest }) => ({ ...rest, senderId: null })) ?? null
  if (report.voice) {
    for (const kind of ['voice', 'round'] as const) {
      const longest = report.voice[kind].longest
      if (longest) report.voice[kind].longest = { ...longest, senderId: null }
    }
  }
  return {
    summary: { ...dto.summary, chatId: token, title: settings.showName ? dto.summary.title : '' },
    report,
    derived: { ...dto.derived, quiz: [] },
    previous: null,
  }
}

const expected = (question: QuizQuestionDto) => (question.answer === 'mine' ? 'author' : 'guest')

function toResult(row: Row): ShareLinkDto['result'] {
  const { result, payload } = row
  if (!result || payload.kind !== 'quiz') return null
  return {
    answeredAt: result.answeredAt,
    score: result.share ? result.score : null,
    total: result.total,
    correct: result.share
      ? payload.questions.map((question, index) => result.picks[index] === expected(question))
      : null,
  }
}

function toDto(row: Row): ShareLinkDto {
  return {
    kind: row.kind,
    token: row.token,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    views: row.views,
    settings: row.kind === 'report' ? (row.settings ?? DEFAULT_REPORT_SETTINGS) : null,
    questions: row.payload.kind === 'quiz' ? row.payload.questions : null,
    result: toResult(row),
  }
}

const quizQuestions = (dto: ReportDto): QuizQuestionDto[] => (dto.report.group ? [] : deriveQuiz(dto.report))

export async function listLinks(userId: string, chatId: string): Promise<ShareLinksResponse> {
  const report = await reportRow(userId, chatId)
  const dto = await getReport(userId, chatId)
  const rows = await db.query.shareLinks.findMany({ where: eq(schema.shareLinks.reportId, report.id) })
  const now = Date.now()
  return {
    links: rows.filter((row) => !row.expiresAt || row.expiresAt.getTime() > now).map(toDto),
    quizAvailable: dto ? quizQuestions(dto).length >= MIN_QUIZ_QUESTIONS : false,
  }
}

/** Makes the link of this kind, or replaces it with a new address and a fresh copy of the data. */
export async function createLink(userId: string, chatId: string, body: CreateShareLinkBody): Promise<ShareLinkDto> {
  const report = await reportRow(userId, chatId)
  const dto = await getReport(userId, chatId)
  if (!dto) throw notFound('CHAT_NOT_FOUND', 'Report not found')
  if (dto.report.group) throw new ApiError(422, 'QUIZ_UNAVAILABLE', 'Group reports cannot be shared by link')
  const user = await db.query.users.findFirst({ columns: { firstName: true }, where: eq(schema.users.id, userId) })
  const author = user?.firstName?.trim() || 'Telegram'
  const token = newToken()
  const settings = body.kind === 'report' ? (body.settings ?? DEFAULT_REPORT_SETTINGS) : null

  let payload: ShareLinkPayload
  if (body.kind === 'quiz') {
    const questions = quizQuestions(dto)
    if (questions.length < MIN_QUIZ_QUESTIONS) throw new ApiError(422, 'QUIZ_UNAVAILABLE', 'Too few clear answers')
    payload = { kind: 'quiz', author, questions }
  } else payload = { kind: 'report', author, data: publicReport(dto, settings!, token) }

  const values = {
    token,
    userId,
    reportId: report.id,
    kind: body.kind,
    settings,
    payload,
    result: null,
    views: 0,
    createdAt: new Date(),
    expiresAt: body.days ? new Date(Date.now() + body.days * DAY_MS) : null,
  }
  const [row] = await db
    .insert(schema.shareLinks)
    .values(values)
    .onConflictDoUpdate({ target: [schema.shareLinks.reportId, schema.shareLinks.kind], set: values })
    .returning()
  return toDto(row!)
}

export async function deleteLink(userId: string, chatId: string, kind: ShareLinkKind) {
  const report = await reportRow(userId, chatId)
  const deleted = await db
    .delete(schema.shareLinks)
    .where(and(eq(schema.shareLinks.reportId, report.id), eq(schema.shareLinks.kind, kind)))
    .returning({ id: schema.shareLinks.id })
  return deleted.length > 0
}

async function openRow(token: string): Promise<Row> {
  const row = await db.query.shareLinks.findFirst({ where: eq(schema.shareLinks.token, token) })
  if (!row || (row.expiresAt && row.expiresAt.getTime() <= Date.now())) throw linkNotFound()
  return row
}

/** The colour family of the shared chat, so the guest sees the person in the colour the owner does. */
async function hueOf(row: Row) {
  const report = await db.query.chatReports.findFirst({
    where: eq(schema.chatReports.id, row.reportId),
    columns: { tgChatId: true },
  })
  return telegramHueIndex(report?.tgChatId ?? row.token)
}

/** The quiz in the guest's terms: the author's «mine» is «author», «theirs» is the guest. */
function toPublic(row: Row, hue: number): PublicShareDto {
  const { payload } = row
  const expiresAt = row.expiresAt?.toISOString() ?? null
  if (payload.kind === 'report') {
    return {
      kind: 'report',
      author: payload.author,
      hue,
      expiresAt,
      settings: row.settings ?? DEFAULT_REPORT_SETTINGS,
      data: payload.data,
    }
  }
  const result = row.result
  return {
    kind: 'quiz',
    author: payload.author,
    hue,
    expiresAt,
    questions: payload.questions.map((question) => ({
      id: question.id,
      unit: question.unit,
      author: question.mine,
      guest: question.theirs,
      answer: expected(question),
    })),
    answered: result
      ? { score: result.score, total: result.total, picks: result.picks, answeredAt: result.answeredAt }
      : null,
  }
}

export async function openLink(token: string): Promise<PublicShareDto> {
  const row = await openRow(token)
  await db
    .update(schema.shareLinks)
    .set({ views: row.views + 1 })
    .where(eq(schema.shareLinks.id, row.id))
  return toPublic(row, await hueOf(row))
}

/** Stores the guest's answers once; a second answer gets the first result back. */
export async function answerQuiz(
  token: string,
  picks: ('author' | 'guest')[],
  share: boolean,
): Promise<PublicShareDto> {
  const row = await openRow(token)
  if (row.payload.kind !== 'quiz') throw linkNotFound()
  if (row.result) throw conflict('QUIZ_ANSWERED', 'The quiz has been answered')
  const questions = row.payload.questions
  if (picks.length !== questions.length) throw new ApiError(400, 'INVALID_REQUEST', 'One answer per question')
  const score = questions.filter((question, index) => expected(question) === picks[index]).length
  const result: ShareLinkResult = { picks, score, total: questions.length, share, answeredAt: new Date().toISOString() }
  const [updated] = await db
    .update(schema.shareLinks)
    .set({ result })
    .where(eq(schema.shareLinks.id, row.id))
    .returning()
  return toPublic(updated!, await hueOf(updated!))
}

/** Every live link of the user with its chat, newest first: the home summary reads quiz answers from it. */
export async function listUserLinks(userId: string): Promise<UserShareLinkDto[]> {
  const rows = await db
    .select({ link: schema.shareLinks, chatId: schema.chatReports.tgChatId, title: schema.chatReports.title })
    .from(schema.shareLinks)
    .innerJoin(schema.chatReports, eq(schema.chatReports.id, schema.shareLinks.reportId))
    .where(eq(schema.shareLinks.userId, userId))
    .orderBy(desc(schema.shareLinks.createdAt))
  const now = Date.now()
  return rows
    .filter(({ link }) => !link.expiresAt || link.expiresAt.getTime() > now)
    .map(({ link, chatId, title }) => ({
      chatId: String(chatId),
      title,
      kind: link.kind,
      expiresAt: link.expiresAt?.toISOString() ?? null,
      result: toResult(link),
    }))
}

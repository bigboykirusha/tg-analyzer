import { createHash, randomBytes } from 'node:crypto'
import {
  canManageMember,
  OWNED_TEAMS_LIMIT,
  PLAN_LIMITS,
  TEAM_INVITE_TTL_DAYS,
  teamCan,
  teamPermissions,
  type AssignableTeamRole,
  type AuditEntryDto,
  type InvitePreviewDto,
  type ReportSharingDto,
  type TeamAction,
  type TeamDto,
  type TeamInviteDto,
  type TeamMemberDto,
  type TeamReportDto,
  type TeamReportSummaryDto,
  type TeamRole,
  type TeamSummaryDto,
} from '@tg-analyzer/shared'
import { aliasedTable, and, count, desc, eq, gt, isNull, lt, sql } from 'drizzle-orm'
import { config } from '../../config'
import { db, schema, type Transaction } from '../../db'
import type { TeamRow } from '../../db/schema'
import { ApiError, conflict, notFound } from '../../lib/errors'
import { addMs, DAY_MS } from '../../lib/time'
import { getReportById, summaryColumns, summaryOf } from '../reports/repository'
import { recordAudit } from './audit'

const teamNotFound = () => notFound('TEAM_NOT_FOUND', 'Team not found')
const forbidden = () => new ApiError(403, 'TEAM_FORBIDDEN', 'Your role does not allow this')
const planLimit = (what: string) => new ApiError(403, 'PLAN_LIMIT_REACHED', `The team plan allows no more ${what}`)

export const hashInviteToken = (token: string) => createHash('sha256').update(token).digest('hex')

interface Membership {
  team: TeamRow
  role: TeamRole
}

/**
 * Resolves the caller's membership. Outsiders get «not found», so a team id
 * reveals nothing; members without the right get «forbidden».
 */
export async function requireMembership(userId: string, teamId: string, action: TeamAction = 'read') {
  const [row] = await db
    .select({ team: schema.teams, role: schema.teamMembers.role })
    .from(schema.teamMembers)
    .innerJoin(schema.teams, eq(schema.teams.id, schema.teamMembers.teamId))
    .where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, userId)))
  if (!row) throw teamNotFound()
  if (!teamCan(row.role, action)) throw forbidden()
  return row satisfies Membership
}

async function teamCounts(teamId: string, tx: Transaction | typeof db = db) {
  const [[members], [reports]] = await Promise.all([
    tx.select({ value: count() }).from(schema.teamMembers).where(eq(schema.teamMembers.teamId, teamId)),
    tx.select({ value: count() }).from(schema.teamReports).where(eq(schema.teamReports.teamId, teamId)),
  ])
  return { memberCount: members?.value ?? 0, reportCount: reports?.value ?? 0 }
}

async function toTeamDto({ team, role }: Membership): Promise<TeamDto> {
  return {
    id: team.id,
    name: team.name,
    role,
    plan: team.plan,
    ...(await teamCounts(team.id)),
    createdAt: team.createdAt.toISOString(),
    limits: PLAN_LIMITS[team.plan] ?? PLAN_LIMITS.free,
    permissions: teamPermissions(role),
    billingEnabled: config.BILLING_ENABLED,
  }
}

// ---------------------------------------------------------------------------
// Teams
// ---------------------------------------------------------------------------

export async function listTeams(userId: string): Promise<TeamSummaryDto[]> {
  const memberCount = db
    .select({ teamId: schema.teamMembers.teamId, value: count().as('member_count') })
    .from(schema.teamMembers)
    .groupBy(schema.teamMembers.teamId)
    .as('member_count')
  const reportCount = db
    .select({ teamId: schema.teamReports.teamId, value: count().as('report_count') })
    .from(schema.teamReports)
    .groupBy(schema.teamReports.teamId)
    .as('report_count')

  const rows = await db
    .select({
      id: schema.teams.id,
      name: schema.teams.name,
      plan: schema.teams.plan,
      role: schema.teamMembers.role,
      memberCount: sql<number>`coalesce(${memberCount.value}, 0)`.mapWith(Number),
      reportCount: sql<number>`coalesce(${reportCount.value}, 0)`.mapWith(Number),
    })
    .from(schema.teamMembers)
    .innerJoin(schema.teams, eq(schema.teams.id, schema.teamMembers.teamId))
    .leftJoin(memberCount, eq(memberCount.teamId, schema.teams.id))
    .leftJoin(reportCount, eq(reportCount.teamId, schema.teams.id))
    .where(eq(schema.teamMembers.userId, userId))
    .orderBy(schema.teams.createdAt)
  return rows
}

export async function createTeam(userId: string, name: string): Promise<TeamDto> {
  const team = await db.transaction(async (tx) => {
    // Serialises concurrent creations by the same person, so the cap holds.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`teams:${userId}`}))`)
    const [owned] = await tx.select({ value: count() }).from(schema.teams).where(eq(schema.teams.ownerId, userId))
    if ((owned?.value ?? 0) >= OWNED_TEAMS_LIMIT)
      throw new ApiError(403, 'TEAMS_LIMIT_REACHED', `One person can own up to ${OWNED_TEAMS_LIMIT} teams`)

    const [created] = await tx.insert(schema.teams).values({ name, ownerId: userId }).returning()
    if (!created) throw new Error('Team persistence failed')
    await tx.insert(schema.teamMembers).values({ teamId: created.id, userId, role: 'owner' })
    await recordAudit(tx, { teamId: created.id, actorId: userId, action: 'team.created', details: { name } })
    return created
  })
  return toTeamDto({ team, role: 'owner' })
}

export async function getTeam(userId: string, teamId: string) {
  return toTeamDto(await requireMembership(userId, teamId))
}

export async function renameTeam(userId: string, teamId: string, name: string) {
  const membership = await requireMembership(userId, teamId, 'rename')
  const [team] = await db.update(schema.teams).set({ name }).where(eq(schema.teams.id, teamId)).returning()
  if (!team) throw teamNotFound()
  await recordAudit(db, { teamId, actorId: userId, action: 'team.renamed', details: { name } })
  return toTeamDto({ team, role: membership.role })
}

/** Members, invitations, shares and the log go with the team; the reports themselves stay with their owners. */
export async function deleteTeam(userId: string, teamId: string) {
  await requireMembership(userId, teamId, 'delete')
  await db.delete(schema.teams).where(eq(schema.teams.id, teamId))
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export async function listMembers(userId: string, teamId: string): Promise<TeamMemberDto[]> {
  await requireMembership(userId, teamId)
  const rows = await db
    .select({
      userId: schema.teamMembers.userId,
      role: schema.teamMembers.role,
      joinedAt: schema.teamMembers.joinedAt,
      firstName: schema.users.firstName,
      username: schema.users.username,
    })
    .from(schema.teamMembers)
    .innerJoin(schema.users, eq(schema.users.id, schema.teamMembers.userId))
    .where(eq(schema.teamMembers.teamId, teamId))
    .orderBy(schema.teamMembers.joinedAt)
  const order: TeamRole[] = ['owner', 'admin', 'analyst', 'viewer']
  return rows
    .map((row) => ({
      userId: row.userId,
      name: row.firstName,
      username: row.username,
      role: row.role,
      joinedAt: row.joinedAt.toISOString(),
      isYou: row.userId === userId,
    }))
    .sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role))
}

async function memberRole(teamId: string, userId: string) {
  const row = await db.query.teamMembers.findFirst({
    columns: { role: true },
    where: and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, userId)),
  })
  return row?.role ?? null
}

export async function changeMemberRole(actorId: string, teamId: string, targetId: string, role: AssignableTeamRole) {
  const actor = await requireMembership(actorId, teamId, 'manageMembers')
  const previousRole = await memberRole(teamId, targetId)
  if (!previousRole) throw notFound('NOT_FOUND', 'Member not found')
  if (targetId === actorId || !canManageMember(actor.role, previousRole)) throw forbidden()
  if (previousRole === role) return

  await db
    .update(schema.teamMembers)
    .set({ role })
    .where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, targetId)))
  await recordAudit(db, {
    teamId,
    actorId,
    subjectId: targetId,
    action: 'member.role_changed',
    details: { role, previousRole },
  })
}

/**
 * Removes a member, or lets one leave. Whatever they shared leaves with them:
 * a report is only ever visible while its author is in the team.
 */
export async function removeMember(actorId: string, teamId: string, targetId: string) {
  const leaving = actorId === targetId
  const actor = await requireMembership(actorId, teamId)
  const targetRole = leaving ? actor.role : await memberRole(teamId, targetId)
  if (!targetRole) throw notFound('NOT_FOUND', 'Member not found')
  if (leaving && targetRole === 'owner')
    throw new ApiError(409, 'TEAM_OWNER_CANNOT_LEAVE', 'The owner deletes the team instead of leaving it')
  if (!leaving && !canManageMember(actor.role, targetRole)) throw forbidden()

  await db.transaction(async (tx) => {
    await tx
      .delete(schema.teamReports)
      .where(and(eq(schema.teamReports.teamId, teamId), eq(schema.teamReports.sharedBy, targetId)))
    await tx
      .delete(schema.teamMembers)
      .where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, targetId)))
    await recordAudit(tx, {
      teamId,
      actorId,
      subjectId: targetId,
      action: leaving ? 'member.left' : 'member.removed',
      details: { role: targetRole },
    })
  })
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

const creator = aliasedTable(schema.users, 'creator')

function toInviteDto(row: typeof schema.teamInvites.$inferSelect, createdBy: string | null): TeamInviteDto {
  return {
    id: row.id,
    role: row.role as AssignableTeamRole,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    uses: row.uses,
    createdBy,
  }
}

export async function listInvites(userId: string, teamId: string): Promise<TeamInviteDto[]> {
  await requireMembership(userId, teamId, 'manageInvites')
  const rows = await db
    .select({ invite: schema.teamInvites, createdBy: creator.firstName })
    .from(schema.teamInvites)
    .leftJoin(creator, eq(creator.id, schema.teamInvites.createdBy))
    .where(
      and(
        eq(schema.teamInvites.teamId, teamId),
        isNull(schema.teamInvites.revokedAt),
        gt(schema.teamInvites.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(schema.teamInvites.createdAt))
  return rows.map((row) => toInviteDto(row.invite, row.createdBy))
}

export async function createInvite(userId: string, teamId: string, role: AssignableTeamRole) {
  const { team } = await requireMembership(userId, teamId, 'manageInvites')
  const { memberCount } = await teamCounts(teamId)
  if (memberCount >= (PLAN_LIMITS[team.plan] ?? PLAN_LIMITS.free).members) throw planLimit('members')

  const token = randomBytes(24).toString('base64url')
  const [invite] = await db
    .insert(schema.teamInvites)
    .values({
      teamId,
      role,
      tokenHash: hashInviteToken(token),
      createdBy: userId,
      expiresAt: addMs(new Date(), TEAM_INVITE_TTL_DAYS * DAY_MS),
    })
    .returning()
  if (!invite) throw new Error('Invite persistence failed')
  await recordAudit(db, { teamId, actorId: userId, action: 'invite.created', details: { role } })
  const author = await db.query.users.findFirst({ columns: { firstName: true }, where: eq(schema.users.id, userId) })
  return { invite: toInviteDto(invite, author?.firstName ?? null), token }
}

export async function revokeInvite(userId: string, teamId: string, inviteId: string) {
  await requireMembership(userId, teamId, 'manageInvites')
  const [revoked] = await db
    .update(schema.teamInvites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(schema.teamInvites.id, inviteId),
        eq(schema.teamInvites.teamId, teamId),
        isNull(schema.teamInvites.revokedAt),
      ),
    )
    .returning({ role: schema.teamInvites.role })
  if (!revoked) throw notFound('INVITE_INVALID', 'Invite not found')
  await recordAudit(db, { teamId, actorId: userId, action: 'invite.revoked', details: { role: revoked.role } })
}

async function findLiveInvite(token: string, tx: Transaction | typeof db = db) {
  const [row] = await tx
    .select({ invite: schema.teamInvites, team: schema.teams, invitedBy: creator.firstName })
    .from(schema.teamInvites)
    .innerJoin(schema.teams, eq(schema.teams.id, schema.teamInvites.teamId))
    .leftJoin(creator, eq(creator.id, schema.teamInvites.createdBy))
    .where(
      and(
        eq(schema.teamInvites.tokenHash, hashInviteToken(token)),
        isNull(schema.teamInvites.revokedAt),
        gt(schema.teamInvites.expiresAt, new Date()),
      ),
    )
  // Expired, revoked and unknown links look the same from outside.
  if (!row) throw notFound('INVITE_INVALID', 'This invitation link is no longer valid')
  return row
}

export async function previewInvite(userId: string, token: string): Promise<InvitePreviewDto> {
  const { invite, team, invitedBy } = await findLiveInvite(token)
  const { memberCount } = await teamCounts(team.id)
  return {
    teamId: team.id,
    teamName: team.name,
    role: invite.role as AssignableTeamRole,
    invitedBy,
    memberCount,
    alreadyMember: (await memberRole(team.id, userId)) !== null,
  }
}

export async function acceptInvite(userId: string, token: string) {
  return db.transaction(async (tx) => {
    const { invite, team } = await findLiveInvite(token, tx)
    // One join at a time per team, so the member cap cannot be overshot.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`team:${team.id}`}))`)
    const existing = await tx.query.teamMembers.findFirst({
      where: and(eq(schema.teamMembers.teamId, team.id), eq(schema.teamMembers.userId, userId)),
    })
    if (existing) return { teamId: team.id }

    const { memberCount } = await teamCounts(team.id, tx)
    if (memberCount >= (PLAN_LIMITS[team.plan] ?? PLAN_LIMITS.free).members) throw planLimit('members')

    await tx.insert(schema.teamMembers).values({ teamId: team.id, userId, role: invite.role })
    await tx
      .update(schema.teamInvites)
      .set({ uses: sql`${schema.teamInvites.uses} + 1` })
      .where(eq(schema.teamInvites.id, invite.id))
    await recordAudit(tx, {
      teamId: team.id,
      actorId: userId,
      subjectId: userId,
      action: 'member.joined',
      details: { role: invite.role },
    })
    return { teamId: team.id }
  })
}

// ---------------------------------------------------------------------------
// Shared reports
// ---------------------------------------------------------------------------

const sharer = aliasedTable(schema.users, 'sharer')

export async function listTeamReports(userId: string, teamId: string): Promise<TeamReportSummaryDto[]> {
  await requireMembership(userId, teamId)
  const rows = await db
    .select({
      ...summaryColumns(),
      reportId: schema.teamReports.reportId,
      sharedAt: schema.teamReports.sharedAt,
      sharedById: schema.teamReports.sharedBy,
      sharedByName: sharer.firstName,
    })
    .from(schema.teamReports)
    .innerJoin(schema.chatReports, eq(schema.chatReports.id, schema.teamReports.reportId))
    .innerJoin(sharer, eq(sharer.id, schema.teamReports.sharedBy))
    .where(eq(schema.teamReports.teamId, teamId))
    .orderBy(desc(schema.chatReports.analyzedAt))
  return rows.map((row) => ({
    ...summaryOf(row),
    reportId: row.reportId,
    sharedAt: row.sharedAt.toISOString(),
    sharedBy: { userId: row.sharedById, name: row.sharedByName },
    mine: row.sharedById === userId,
  }))
}

export async function getTeamReport(userId: string, teamId: string, reportId: string): Promise<TeamReportDto> {
  await requireMembership(userId, teamId)
  const [share] = await db
    .select({ share: schema.teamReports, sharedByName: sharer.firstName })
    .from(schema.teamReports)
    .innerJoin(sharer, eq(sharer.id, schema.teamReports.sharedBy))
    .where(and(eq(schema.teamReports.teamId, teamId), eq(schema.teamReports.reportId, reportId)))
  const report = share ? await getReportById(reportId) : null
  if (!share || !report) throw notFound('CHAT_NOT_FOUND', 'Report not found')
  return {
    ...report,
    shared: {
      reportId,
      sharedAt: share.share.sharedAt.toISOString(),
      sharedBy: { userId: share.share.sharedBy, name: share.sharedByName },
      mine: share.share.sharedBy === userId,
    },
  }
}

async function ownReport(userId: string, chatId: string) {
  const report = await db.query.chatReports.findFirst({
    columns: { id: true, title: true },
    where: and(eq(schema.chatReports.userId, userId), eq(schema.chatReports.tgChatId, Number(chatId))),
  })
  if (!report) throw notFound('CHAT_NOT_FOUND', 'Report not found')
  return report
}

/** Only the author of a report can open it to a team. */
export async function shareReport(userId: string, teamId: string, chatId: string) {
  const report = await ownReport(userId, chatId)
  await db.transaction(async (tx) => {
    const [membership] = await tx
      .select({ role: schema.teamMembers.role, plan: schema.teams.plan })
      .from(schema.teamMembers)
      .innerJoin(schema.teams, eq(schema.teams.id, schema.teamMembers.teamId))
      .where(and(eq(schema.teamMembers.teamId, teamId), eq(schema.teamMembers.userId, userId)))
    if (!membership) throw teamNotFound()
    if (!teamCan(membership.role, 'shareReports')) throw forbidden()

    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`team:${teamId}`}))`)
    const { reportCount } = await teamCounts(teamId, tx)
    if (reportCount >= (PLAN_LIMITS[membership.plan] ?? PLAN_LIMITS.free).sharedReports) throw planLimit('reports')

    const inserted = await tx
      .insert(schema.teamReports)
      .values({ teamId, reportId: report.id, sharedBy: userId })
      .onConflictDoNothing()
      .returning({ reportId: schema.teamReports.reportId })
    if (!inserted.length) throw conflict('REPORT_ALREADY_SHARED', 'This report is already open to the team')
    await recordAudit(tx, { teamId, actorId: userId, action: 'report.shared', details: { title: report.title } })
  })
}

/** The author takes their report back; admins can take down anything. */
export async function unshareReport(userId: string, teamId: string, reportId: string) {
  const membership = await requireMembership(userId, teamId)
  const [share] = await db
    .select({ sharedBy: schema.teamReports.sharedBy, title: schema.chatReports.title })
    .from(schema.teamReports)
    .innerJoin(schema.chatReports, eq(schema.chatReports.id, schema.teamReports.reportId))
    .where(and(eq(schema.teamReports.teamId, teamId), eq(schema.teamReports.reportId, reportId)))
  if (!share) throw notFound('CHAT_NOT_FOUND', 'Report not found')
  if (share.sharedBy !== userId && !teamCan(membership.role, 'manageReports')) throw forbidden()

  await db
    .delete(schema.teamReports)
    .where(and(eq(schema.teamReports.teamId, teamId), eq(schema.teamReports.reportId, reportId)))
  await recordAudit(db, {
    teamId,
    actorId: userId,
    subjectId: share.sharedBy,
    action: 'report.unshared',
    details: { title: share.title },
  })
}

export async function reportSharing(userId: string, chatId: string): Promise<ReportSharingDto> {
  const report = await ownReport(userId, chatId)
  const rows = await db
    .select({
      id: schema.teams.id,
      name: schema.teams.name,
      role: schema.teamMembers.role,
      shared: sql<boolean>`${schema.teamReports.reportId} is not null`,
    })
    .from(schema.teamMembers)
    .innerJoin(schema.teams, eq(schema.teams.id, schema.teamMembers.teamId))
    .leftJoin(
      schema.teamReports,
      and(eq(schema.teamReports.teamId, schema.teams.id), eq(schema.teamReports.reportId, report.id)),
    )
    .where(eq(schema.teamMembers.userId, userId))
    .orderBy(schema.teams.createdAt)
  return { teams: rows.map((row) => ({ ...row, canShare: teamCan(row.role, 'shareReports') })) }
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

const actor = aliasedTable(schema.users, 'actor')
const subject = aliasedTable(schema.users, 'subject')

export async function listAudit(userId: string, teamId: string, query: { before?: string; limit: number }) {
  await requireMembership(userId, teamId, 'readAudit')
  const rows = await db
    .select({ entry: schema.teamAuditLog, actor: actor.firstName, subject: subject.firstName })
    .from(schema.teamAuditLog)
    .leftJoin(actor, eq(actor.id, schema.teamAuditLog.actorId))
    .leftJoin(subject, eq(subject.id, schema.teamAuditLog.subjectId))
    .where(
      and(
        eq(schema.teamAuditLog.teamId, teamId),
        query.before ? lt(schema.teamAuditLog.createdAt, new Date(query.before)) : undefined,
      ),
    )
    .orderBy(desc(schema.teamAuditLog.createdAt))
    .limit(query.limit + 1)

  const page = rows.slice(0, query.limit)
  const entries: AuditEntryDto[] = page.map((row) => ({
    id: row.entry.id,
    action: row.entry.action,
    actor: row.actor,
    subject: row.subject,
    details: row.entry.details,
    createdAt: row.entry.createdAt.toISOString(),
  }))
  return {
    entries,
    nextBefore: rows.length > query.limit ? (entries.at(-1)?.createdAt ?? null) : null,
  }
}

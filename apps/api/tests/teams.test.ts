import test from 'node:test'
import assert from 'node:assert/strict'
import type {
  AuditLogResponse,
  CreateInviteResponse,
  InvitePreviewDto,
  ReportSharingDto,
  TeamDto,
  TeamMembersResponse,
  TeamReportDto,
  TeamReportsResponse,
  TeamsResponse,
} from '@tg-analyzer/shared'
import { ORIGIN, app, login, pool, processJob, useTestServer, type Session } from './helpers'

useTestServer()

const PRIVATE_CHAT = '1006'
const GROUP_CHAT = '-1002004'

function call(session: Session, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object) {
  return app.inject({ method, url, headers: { ...session.headers, origin: ORIGIN }, payload })
}

async function analyse(session: Session, chatId: string) {
  const started = await call(session, 'POST', '/api/v1/parse/start', { chatId })
  assert.equal(started.statusCode, 200, started.body)
  await processJob(session.userId, started.json<{ jobId: string }>().jobId)
}

async function createTeam(session: Session, name = 'Отдел продаж') {
  const created = await call(session, 'POST', '/api/v1/teams', { name })
  assert.equal(created.statusCode, 201, created.body)
  return created.json<TeamDto>()
}

async function invite(session: Session, teamId: string, role = 'analyst') {
  const created = await call(session, 'POST', `/api/v1/teams/${teamId}/invites`, { role })
  assert.equal(created.statusCode, 201, created.body)
  return created.json<CreateInviteResponse>()
}

async function join(session: Session, token: string) {
  const accepted = await call(session, 'POST', `/api/v1/invites/${token}/accept`)
  assert.equal(accepted.statusCode, 200, accepted.body)
}

test('a team starts with its creator as owner on the free plan', async () => {
  const owner = await login('+79990000101')
  const team = await createTeam(owner, '  Отдел   продаж ')
  assert.equal(team.name, 'Отдел продаж')
  assert.equal(team.role, 'owner')
  assert.equal(team.plan, 'free')
  assert.equal(team.memberCount, 1)
  assert.equal(team.billingEnabled, false)
  assert.equal(team.permissions.delete, true)

  const list = (await call(owner, 'GET', '/api/v1/teams')).json<TeamsResponse>()
  assert.deepEqual(
    list.teams.map((item) => [item.name, item.role, item.memberCount]),
    [['Отдел продаж', 'owner', 1]],
  )

  // Outsiders cannot tell a team exists.
  const stranger = await login('+79990000102')
  const peek = await call(stranger, 'GET', `/api/v1/teams/${team.id}`)
  assert.equal(peek.statusCode, 404)
  assert.equal(peek.json().code, 'TEAM_NOT_FOUND')
})

test('invitation links add members with the role they carry and can be revoked', async () => {
  const owner = await login('+79990000111')
  const viewer = await login('+79990000112')
  const late = await login('+79990000113')
  const team = await createTeam(owner)
  const { token, invite: created } = await invite(owner, team.id, 'viewer')

  const preview = (await call(viewer, 'GET', `/api/v1/invites/${token}`)).json<InvitePreviewDto>()
  assert.equal(preview.teamName, 'Отдел продаж')
  assert.equal(preview.role, 'viewer')
  assert.equal(preview.alreadyMember, false)

  await join(viewer, token)
  await join(viewer, token) // accepting twice is harmless
  const members = (await call(owner, 'GET', `/api/v1/teams/${team.id}/members`)).json<TeamMembersResponse>()
  assert.deepEqual(
    members.members.map((member) => member.role),
    ['owner', 'viewer'],
  )

  // Viewers read, but cannot invite.
  const denied = await call(viewer, 'POST', `/api/v1/teams/${team.id}/invites`, { role: 'admin' })
  assert.equal(denied.statusCode, 403)
  assert.equal(denied.json().code, 'TEAM_FORBIDDEN')

  // Ownership is never handed out by link.
  const ownerInvite = await call(owner, 'POST', `/api/v1/teams/${team.id}/invites`, { role: 'owner' })
  assert.equal(ownerInvite.statusCode, 400)

  assert.equal((await call(owner, 'DELETE', `/api/v1/teams/${team.id}/invites/${created.id}`)).statusCode, 200)
  const revoked = await call(late, 'POST', `/api/v1/invites/${token}/accept`)
  assert.equal(revoked.statusCode, 404)
  assert.equal(revoked.json().code, 'INVITE_INVALID')

  // Only a hash of the token is kept.
  const stored = await pool.query('select token_hash from team_invites')
  assert.ok(stored.rows.every((row: { token_hash: string }) => row.token_hash !== token))
})

test('the free plan caps members and shared reports', async () => {
  const owner = await login('+79990000121')
  const team = await createTeam(owner)
  const { token } = await invite(owner, team.id)
  await join(await login('+79990000122'), token)
  await join(await login('+79990000123'), token)

  const full = await call(await login('+79990000124'), 'POST', `/api/v1/invites/${token}/accept`)
  assert.equal(full.statusCode, 403)
  assert.equal(full.json().code, 'PLAN_LIMIT_REACHED')
  const noMoreInvites = await call(owner, 'POST', `/api/v1/teams/${team.id}/invites`, { role: 'viewer' })
  assert.equal(noMoreInvites.json().code, 'PLAN_LIMIT_REACHED')

  // A paid plan, assigned by hand while billing is off, lifts the cap.
  await pool.query(`update teams set plan = 'team' where id = $1`, [team.id])
  await join(await login('+79990000124'), token)
  const upgraded = (await call(owner, 'GET', `/api/v1/teams/${team.id}`)).json<TeamDto>()
  assert.equal(upgraded.memberCount, 4)
  assert.equal(upgraded.limits.members, 10)
})

test('members read the reports colleagues share, and only while the author stays', async () => {
  const owner = await login('+79990000131')
  const analyst = await login('+79990000132')
  const viewer = await login('+79990000133')
  const team = await createTeam(owner)
  await join(analyst, (await invite(owner, team.id, 'analyst')).token)
  await join(viewer, (await invite(owner, team.id, 'viewer')).token)
  await analyse(analyst, GROUP_CHAT)
  await analyse(viewer, PRIVATE_CHAT)

  // Viewers cannot share, analysts can share their own reports only.
  assert.equal(
    (await call(viewer, 'POST', `/api/v1/teams/${team.id}/reports`, { chatId: PRIVATE_CHAT })).statusCode,
    403,
  )
  const notTheirs = await call(owner, 'POST', `/api/v1/teams/${team.id}/reports`, { chatId: GROUP_CHAT })
  assert.equal(notTheirs.statusCode, 404)
  assert.equal(
    (await call(analyst, 'POST', `/api/v1/teams/${team.id}/reports`, { chatId: GROUP_CHAT })).statusCode,
    201,
  )
  const again = await call(analyst, 'POST', `/api/v1/teams/${team.id}/reports`, { chatId: GROUP_CHAT })
  assert.equal(again.json().code, 'REPORT_ALREADY_SHARED')

  const sharing = (await call(analyst, 'GET', `/api/v1/reports/${GROUP_CHAT}/sharing`)).json<ReportSharingDto>()
  assert.deepEqual(sharing.teams, [
    { id: team.id, name: 'Отдел продаж', role: 'analyst', canShare: true, shared: true },
  ])

  const list = (await call(viewer, 'GET', `/api/v1/teams/${team.id}/reports`)).json<TeamReportsResponse>()
  assert.equal(list.reports.length, 1)
  const [shared] = list.reports
  assert.ok(shared)
  assert.equal(shared.type, 'group')
  assert.equal(shared.mine, false)
  assert.equal(shared.sharedBy.userId, analyst.userId)

  const opened = await call(viewer, 'GET', `/api/v1/teams/${team.id}/reports/${shared.reportId}`)
  assert.equal(opened.statusCode, 200)
  const report = opened.json<TeamReportDto>()
  assert.equal(report.summary.chatId, GROUP_CHAT)
  assert.ok(report.report.group)
  // The viewer's personal report list is untouched.
  const personal = (await call(viewer, 'GET', '/api/v1/reports')).json<{ reports: { chatId: string }[] }>()
  assert.deepEqual(
    personal.reports.map((item) => item.chatId),
    [PRIVATE_CHAT],
  )

  // A viewer cannot take a colleague's report down; the owner can.
  assert.equal((await call(viewer, 'DELETE', `/api/v1/teams/${team.id}/reports/${shared.reportId}`)).statusCode, 403)

  // Leaving the team takes the author's reports with them.
  assert.equal((await call(analyst, 'DELETE', `/api/v1/teams/${team.id}/members/${analyst.userId}`)).statusCode, 200)
  const after = (await call(viewer, 'GET', `/api/v1/teams/${team.id}/reports`)).json<TeamReportsResponse>()
  assert.equal(after.reports.length, 0)
  assert.equal((await call(viewer, 'GET', `/api/v1/teams/${team.id}/reports/${shared.reportId}`)).statusCode, 404)
})

test('deleting a personal report or the account removes it from every team', async () => {
  const owner = await login('+79990000141')
  const analyst = await login('+79990000142')
  const team = await createTeam(owner)
  await join(analyst, (await invite(owner, team.id)).token)
  await analyse(analyst, PRIVATE_CHAT)
  await call(analyst, 'POST', `/api/v1/teams/${team.id}/reports`, { chatId: PRIVATE_CHAT })
  assert.equal((await call(owner, 'GET', `/api/v1/teams/${team.id}`)).json<TeamDto>().reportCount, 1)

  await call(analyst, 'DELETE', `/api/v1/reports/${PRIVATE_CHAT}`)
  assert.equal((await call(owner, 'GET', `/api/v1/teams/${team.id}`)).json<TeamDto>().reportCount, 0)

  // The owner's account takes the team with it.
  await call(owner, 'DELETE', '/api/v1/auth/account')
  const left = (await call(analyst, 'GET', '/api/v1/teams')).json<TeamsResponse>()
  assert.equal(left.teams.length, 0)
})

test('roles: admins manage members but never the owner, and the owner cannot leave', async () => {
  const owner = await login('+79990000151')
  const admin = await login('+79990000152')
  const viewer = await login('+79990000153')
  const team = await createTeam(owner)
  await join(admin, (await invite(owner, team.id, 'admin')).token)
  await join(viewer, (await invite(owner, team.id, 'viewer')).token)

  assert.equal(
    (await call(admin, 'PATCH', `/api/v1/teams/${team.id}/members/${viewer.userId}`, { role: 'analyst' })).statusCode,
    200,
  )
  assert.equal(
    (await call(admin, 'PATCH', `/api/v1/teams/${team.id}/members/${owner.userId}`, { role: 'viewer' })).statusCode,
    403,
  )
  assert.equal((await call(admin, 'DELETE', `/api/v1/teams/${team.id}/members/${owner.userId}`)).statusCode, 403)
  assert.equal((await call(admin, 'DELETE', `/api/v1/teams/${team.id}`)).statusCode, 403)

  const ownerLeaves = await call(owner, 'DELETE', `/api/v1/teams/${team.id}/members/${owner.userId}`)
  assert.equal(ownerLeaves.json().code, 'TEAM_OWNER_CANNOT_LEAVE')

  assert.equal((await call(admin, 'DELETE', `/api/v1/teams/${team.id}/members/${viewer.userId}`)).statusCode, 200)
  assert.equal((await call(viewer, 'GET', `/api/v1/teams/${team.id}`)).statusCode, 404)

  // The log tells the story newest first, with names joined on read.
  const audit = (await call(admin, 'GET', `/api/v1/teams/${team.id}/audit`)).json<AuditLogResponse>()
  assert.deepEqual(
    audit.entries.map((entry) => entry.action),
    [
      'member.removed',
      'member.role_changed',
      'member.joined',
      'invite.created',
      'member.joined',
      'invite.created',
      'team.created',
    ],
  )
  assert.equal(audit.entries[1]?.details.previousRole, 'viewer')
  assert.equal((await call(viewer, 'GET', `/api/v1/teams/${team.id}/audit`)).statusCode, 404)

  const page = (await call(admin, 'GET', `/api/v1/teams/${team.id}/audit?limit=3`)).json<AuditLogResponse>()
  assert.equal(page.entries.length, 3)
  assert.ok(page.nextBefore)
})

test('one person owns at most five teams', async () => {
  const owner = await login('+79990000161')
  for (let index = 0; index < 5; index += 1) await createTeam(owner, `Команда ${index + 1}`)
  const sixth = await call(owner, 'POST', '/api/v1/teams', { name: 'Ещё одна' })
  assert.equal(sixth.statusCode, 403)
  assert.equal(sixth.json().code, 'TEAMS_LIMIT_REACHED')
  assert.equal((await call(owner, 'POST', '/api/v1/teams', { name: '   ' })).statusCode, 400)
})

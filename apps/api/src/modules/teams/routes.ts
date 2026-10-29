import {
  auditQuerySchema,
  changeRoleBodySchema,
  createInviteBodySchema,
  createTeamBodySchema,
  inviteTokenParamsSchema,
  renameTeamBodySchema,
  shareReportBodySchema,
  teamIdParamsSchema,
  teamInviteParamsSchema,
  teamMemberParamsSchema,
  teamReportParamsSchema,
  type AcceptInviteResponse,
  type AuditLogResponse,
  type CreateInviteResponse,
  type InvitePreviewDto,
  type SuccessResponse,
  type TeamDto,
  type TeamInvitesResponse,
  type TeamMembersResponse,
  type TeamReportDto,
  type TeamReportsResponse,
  type TeamsResponse,
} from '@tg-analyzer/shared'
import type { FastifyPluginAsync } from 'fastify'
import { parse } from '../../http/validation'
import { requireAuth, userIdOf } from '../auth/guard'
import * as teams from './teams.service'

const ok: SuccessResponse = { success: true }

export const teamRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  app.get('/', async (request): Promise<TeamsResponse> => ({ teams: await teams.listTeams(userIdOf(request)) }))

  app.post('/', async (request, reply): Promise<TeamDto> => {
    const { name } = parse(createTeamBodySchema, request.body)
    reply.status(201)
    return teams.createTeam(userIdOf(request), name)
  })

  app.get('/:teamId', async (request): Promise<TeamDto> => {
    const { teamId } = parse(teamIdParamsSchema, request.params)
    return teams.getTeam(userIdOf(request), teamId)
  })

  app.patch('/:teamId', async (request): Promise<TeamDto> => {
    const { teamId } = parse(teamIdParamsSchema, request.params)
    const { name } = parse(renameTeamBodySchema, request.body)
    return teams.renameTeam(userIdOf(request), teamId, name)
  })

  app.delete('/:teamId', async (request): Promise<SuccessResponse> => {
    const { teamId } = parse(teamIdParamsSchema, request.params)
    await teams.deleteTeam(userIdOf(request), teamId)
    return ok
  })

  app.get('/:teamId/members', async (request): Promise<TeamMembersResponse> => {
    const { teamId } = parse(teamIdParamsSchema, request.params)
    return { members: await teams.listMembers(userIdOf(request), teamId) }
  })

  app.patch('/:teamId/members/:userId', async (request): Promise<SuccessResponse> => {
    const { teamId, userId } = parse(teamMemberParamsSchema, request.params)
    const { role } = parse(changeRoleBodySchema, request.body)
    await teams.changeMemberRole(userIdOf(request), teamId, userId, role)
    return ok
  })

  app.delete('/:teamId/members/:userId', async (request): Promise<SuccessResponse> => {
    const { teamId, userId } = parse(teamMemberParamsSchema, request.params)
    await teams.removeMember(userIdOf(request), teamId, userId)
    return ok
  })

  app.get('/:teamId/invites', async (request): Promise<TeamInvitesResponse> => {
    const { teamId } = parse(teamIdParamsSchema, request.params)
    return { invites: await teams.listInvites(userIdOf(request), teamId) }
  })

  app.post('/:teamId/invites', async (request, reply): Promise<CreateInviteResponse> => {
    const { teamId } = parse(teamIdParamsSchema, request.params)
    const { role } = parse(createInviteBodySchema, request.body)
    reply.status(201)
    return teams.createInvite(userIdOf(request), teamId, role)
  })

  app.delete('/:teamId/invites/:inviteId', async (request): Promise<SuccessResponse> => {
    const { teamId, inviteId } = parse(teamInviteParamsSchema, request.params)
    await teams.revokeInvite(userIdOf(request), teamId, inviteId)
    return ok
  })

  app.get('/:teamId/reports', async (request): Promise<TeamReportsResponse> => {
    const { teamId } = parse(teamIdParamsSchema, request.params)
    return { reports: await teams.listTeamReports(userIdOf(request), teamId) }
  })

  app.post('/:teamId/reports', async (request, reply): Promise<SuccessResponse> => {
    const { teamId } = parse(teamIdParamsSchema, request.params)
    const { chatId } = parse(shareReportBodySchema, request.body)
    await teams.shareReport(userIdOf(request), teamId, chatId)
    reply.status(201)
    return ok
  })

  app.get('/:teamId/reports/:reportId', async (request): Promise<TeamReportDto> => {
    const { teamId, reportId } = parse(teamReportParamsSchema, request.params)
    return teams.getTeamReport(userIdOf(request), teamId, reportId)
  })

  app.delete('/:teamId/reports/:reportId', async (request): Promise<SuccessResponse> => {
    const { teamId, reportId } = parse(teamReportParamsSchema, request.params)
    await teams.unshareReport(userIdOf(request), teamId, reportId)
    return ok
  })

  app.get('/:teamId/audit', async (request): Promise<AuditLogResponse> => {
    const { teamId } = parse(teamIdParamsSchema, request.params)
    return teams.listAudit(userIdOf(request), teamId, parse(auditQuerySchema, request.query))
  })
}

export const inviteRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  app.get('/:token', async (request): Promise<InvitePreviewDto> => {
    const { token } = parse(inviteTokenParamsSchema, request.params)
    return teams.previewInvite(userIdOf(request), token)
  })

  app.post('/:token/accept', async (request): Promise<AcceptInviteResponse> => {
    const { token } = parse(inviteTokenParamsSchema, request.params)
    return teams.acceptInvite(userIdOf(request), token)
  })
}

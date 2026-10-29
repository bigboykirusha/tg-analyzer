import { z } from 'zod'
import { ASSIGNABLE_TEAM_ROLES } from '../teams/plans'
import type {
  AcceptInviteResponse,
  AuditLogResponse,
  ChangeRoleBody,
  CreateInviteBody,
  CreateInviteResponse,
  CreateTeamBody,
  InvitePreviewDto,
  RenameTeamBody,
  ReportSharingDto,
  ShareReportBody,
  TeamDto,
  TeamInvitesResponse,
  TeamMembersResponse,
  TeamReportDto,
  TeamReportsResponse,
  TeamsResponse,
  AuthSuccessResponse,
  AvatarsBody,
  AvatarsResponse,
  ClearHistoryResponse,
  DialogsResponse,
  Page,
  ParseJobDto,
  CancelParseBody,
  ParseProgressDto,
  ReportDto,
  ReportsResponse,
  ResendCodeBody,
  SendCodeBody,
  SendCodeResponse,
  StartParseBody,
  StartParseResponse,
  SuccessResponse,
  UpdateProfileBody,
  UserResponse,
  VerifyCodeBody,
  VerifyCodeResponse,
  VerifyPasswordBody,
  WsTicketResponse,
} from './types'

// ---------------------------------------------------------------------------
// Request validation — used by the API and reusable by the client.
// ---------------------------------------------------------------------------

const telegramIdSchema = z.string().regex(/^-?\d{1,20}$/, 'Expected a numeric Telegram id')

export const phoneSchema = z
  .string()
  .transform((value) => value.replace(/[\s()-]/g, ''))
  .pipe(z.string().regex(/^\+?[1-9]\d{6,14}$/, 'Expected an international phone number'))

export const sendCodeBodySchema = z.object({ phone: phoneSchema }) satisfies z.ZodType<SendCodeBody, unknown>

export const resendCodeBodySchema = z.object({
  phone: phoneSchema,
  phoneCodeHash: z.string().min(1).max(256),
}) satisfies z.ZodType<ResendCodeBody, unknown>

export const verifyCodeBodySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{3,10}$/),
  phoneCodeHash: z.string().min(1).max(256),
}) satisfies z.ZodType<VerifyCodeBody, unknown>

export const cancelParseBodySchema = z
  .object({ jobId: z.uuid().optional() })
  .optional()
  .transform((value) => value ?? {}) satisfies z.ZodType<CancelParseBody, unknown>

export const verifyPasswordBodySchema = z.object({
  tempToken: z.uuid(),
  password: z.string().min(1).max(1024),
}) satisfies z.ZodType<VerifyPasswordBody, unknown>

export const updateProfileBodySchema = z
  .object({
    timezone: z.string().min(1).max(64).optional(),
    disconnectAfterAnalysis: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, 'Nothing to update') satisfies z.ZodType<UpdateProfileBody, unknown>

export const startParseBodySchema = z.object({
  chatId: telegramIdSchema,
}) satisfies z.ZodType<StartParseBody, unknown>

/** Avatars are fetched in batches to reuse one Telegram connection. */
export const MAX_AVATAR_BATCH = 30

export const avatarsBodySchema = z.object({
  chatIds: z.array(telegramIdSchema).min(1).max(MAX_AVATAR_BATCH),
}) satisfies z.ZodType<AvatarsBody, unknown>

export const chatIdParamsSchema = z.object({ chatId: telegramIdSchema })
export const jobIdParamsSchema = z.object({ jobId: z.uuid() })

const teamNameSchema = z
  .string()
  .transform((value) => value.trim().replace(/\s+/g, ' '))
  .pipe(z.string().min(1).max(80))

export const createTeamBodySchema = z.object({ name: teamNameSchema }) satisfies z.ZodType<CreateTeamBody, unknown>
export const renameTeamBodySchema = z.object({ name: teamNameSchema }) satisfies z.ZodType<RenameTeamBody, unknown>
export const createInviteBodySchema = z.object({
  role: z.enum(ASSIGNABLE_TEAM_ROLES),
}) satisfies z.ZodType<CreateInviteBody, unknown>
export const changeRoleBodySchema = z.object({
  role: z.enum(ASSIGNABLE_TEAM_ROLES),
}) satisfies z.ZodType<ChangeRoleBody, unknown>
export const shareReportBodySchema = z.object({ chatId: telegramIdSchema }) satisfies z.ZodType<
  ShareReportBody,
  unknown
>

export const teamIdParamsSchema = z.object({ teamId: z.uuid() })
export const teamMemberParamsSchema = z.object({ teamId: z.uuid(), userId: z.uuid() })
export const teamInviteParamsSchema = z.object({ teamId: z.uuid(), inviteId: z.uuid() })
export const teamReportParamsSchema = z.object({ teamId: z.uuid(), reportId: z.uuid() })
export const inviteTokenParamsSchema = z.object({ token: z.string().regex(/^[\w-]{16,128}$/) })
export const auditQuerySchema = z.object({
  before: z.iso.datetime({ offset: true }).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// ---------------------------------------------------------------------------
// Endpoint map — the single source of truth for the typed client.
// ---------------------------------------------------------------------------

type Endpoint<Request, Response, Query = never> = { request: Request; response: Response; query: Query }

export interface ApiEndpointMap {
  'POST /api/v1/auth/send-code': Endpoint<SendCodeBody, SendCodeResponse>
  'POST /api/v1/auth/resend-code': Endpoint<ResendCodeBody, SendCodeResponse>
  'POST /api/v1/auth/verify-code': Endpoint<VerifyCodeBody, VerifyCodeResponse>
  'POST /api/v1/auth/verify-password': Endpoint<VerifyPasswordBody, AuthSuccessResponse>
  'POST /api/v1/auth/refresh': Endpoint<undefined, AuthSuccessResponse>
  'POST /api/v1/auth/logout': Endpoint<undefined, SuccessResponse>
  'POST /api/v1/auth/ws-ticket': Endpoint<undefined, WsTicketResponse>
  'PATCH /api/v1/auth/profile': Endpoint<UpdateProfileBody, UserResponse>
  'DELETE /api/v1/auth/account': Endpoint<undefined, SuccessResponse>
  'POST /api/v1/auth/telegram/disconnect': Endpoint<undefined, UserResponse>
  'GET /api/v1/auth/avatar': Endpoint<undefined, Blob>

  'GET /api/v1/parse/dialogs': Endpoint<undefined, DialogsResponse>
  'POST /api/v1/parse/avatars': Endpoint<AvatarsBody, AvatarsResponse>
  'GET /api/v1/parse/status': Endpoint<undefined, ParseProgressDto>
  'POST /api/v1/parse/start': Endpoint<StartParseBody, StartParseResponse>
  'POST /api/v1/parse/cancel': Endpoint<CancelParseBody, SuccessResponse>
  'GET /api/v1/parse/history': Endpoint<undefined, Page<ParseJobDto>, z.input<typeof paginationQuerySchema>>
  'DELETE /api/v1/parse/history': Endpoint<undefined, ClearHistoryResponse>
  'DELETE /api/v1/parse/history/:jobId': Endpoint<undefined, SuccessResponse>

  'GET /api/v1/reports': Endpoint<undefined, ReportsResponse>
  'GET /api/v1/reports/:chatId': Endpoint<undefined, ReportDto>
  'DELETE /api/v1/reports/:chatId': Endpoint<undefined, SuccessResponse>
  'GET /api/v1/reports/:chatId/sharing': Endpoint<undefined, ReportSharingDto>

  'GET /api/v1/teams': Endpoint<undefined, TeamsResponse>
  'POST /api/v1/teams': Endpoint<CreateTeamBody, TeamDto>
  'GET /api/v1/teams/:teamId': Endpoint<undefined, TeamDto>
  'PATCH /api/v1/teams/:teamId': Endpoint<RenameTeamBody, TeamDto>
  'DELETE /api/v1/teams/:teamId': Endpoint<undefined, SuccessResponse>
  'GET /api/v1/teams/:teamId/members': Endpoint<undefined, TeamMembersResponse>
  'PATCH /api/v1/teams/:teamId/members/:userId': Endpoint<ChangeRoleBody, SuccessResponse>
  'DELETE /api/v1/teams/:teamId/members/:userId': Endpoint<undefined, SuccessResponse>
  'GET /api/v1/teams/:teamId/invites': Endpoint<undefined, TeamInvitesResponse>
  'POST /api/v1/teams/:teamId/invites': Endpoint<CreateInviteBody, CreateInviteResponse>
  'DELETE /api/v1/teams/:teamId/invites/:inviteId': Endpoint<undefined, SuccessResponse>
  'GET /api/v1/teams/:teamId/reports': Endpoint<undefined, TeamReportsResponse>
  'POST /api/v1/teams/:teamId/reports': Endpoint<ShareReportBody, SuccessResponse>
  'GET /api/v1/teams/:teamId/reports/:reportId': Endpoint<undefined, TeamReportDto>
  'DELETE /api/v1/teams/:teamId/reports/:reportId': Endpoint<undefined, SuccessResponse>
  'GET /api/v1/teams/:teamId/audit': Endpoint<undefined, AuditLogResponse, z.input<typeof auditQuerySchema>>

  'GET /api/v1/invites/:token': Endpoint<undefined, InvitePreviewDto>
  'POST /api/v1/invites/:token/accept': Endpoint<undefined, AcceptInviteResponse>
}

export type ApiOperation = keyof ApiEndpointMap
export type ApiRequest<K extends ApiOperation> = ApiEndpointMap[K]['request']
export type ApiResponse<K extends ApiOperation> = ApiEndpointMap[K]['response']
export type ApiQuery<K extends ApiOperation> = ApiEndpointMap[K]['query']

type OperationPath<K extends ApiOperation> = K extends `${string} ${infer Path}` ? Path : never
type PathParameterNames<Path extends string> = Path extends `${string}:${infer Parameter}/${infer Rest}`
  ? Parameter | PathParameterNames<`/${Rest}`>
  : Path extends `${string}:${infer Parameter}`
    ? Parameter
    : never

export type ApiParams<K extends ApiOperation> = [PathParameterNames<OperationPath<K>>] extends [never]
  ? never
  : { [Parameter in PathParameterNames<OperationPath<K>>]: string }

/** Substitutes `:name` placeholders, URL-encoding every value. */
export function buildApiPath(path: string, params: Readonly<Record<string, string>> = {}) {
  const required = new Set(Array.from(path.matchAll(/:([A-Za-z]\w*)/g), (match) => match[1] as string))

  for (const name of required) {
    if (!(name in params)) throw new Error(`Missing route parameter: ${name}`)
  }
  for (const name of Object.keys(params)) {
    if (!required.has(name)) throw new Error(`Unexpected route parameter: ${name}`)
  }

  return path.replace(/:([A-Za-z]\w*)/g, (_match, name: string) => encodeURIComponent(params[name] ?? ''))
}

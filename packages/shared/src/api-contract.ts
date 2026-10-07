import { z } from 'zod'
import type {
  ActivityResponse,
  AuthSuccessResponse,
  ChatStatsDto,
  ClearHistoryResponse,
  DeleteHistoryItemResponse,
  DeleteResponse,
  GlobalStatsDto,
  ParseDialogsResponse,
  ParseHistoryItem,
  ParseStatusResponse,
  PagedChatsResponse,
  PendingPasswordResponse,
  SendCodeBody,
  SendCodeResponse,
  StartParseBody,
  StartParseResponse,
  UpdateProfileBody,
  UpdateProfileResponse,
  VerifyCodeBody,
  VerifyPasswordBody,
  WsAuthTicketResponse,
} from './api'

export const apiErrorResponseSchema = z.object({
  requestId: z.string().optional(),
  message: z.string(),
  code: z.string(),
})

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const chatListQuerySchema = paginationQuerySchema.extend({
  sort: z
    .enum([
      'total_messages',
      'sent_messages',
      'received_messages',
      'last_message_at',
      'first_message_at',
      'chat_name',
      'parsed_at',
    ])
    .default('total_messages'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

export const activityQuerySchema = z.object({
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
})

export const numericChatIdParamsSchema = z.object({
  chatId: z.string().regex(/^-?\d+$/),
})

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export interface ApiEndpointMap {
  'POST /api/v1/auth/send-code': { request: SendCodeBody; response: SendCodeResponse }
  'POST /api/v1/auth/verify-code': { request: VerifyCodeBody; response: AuthSuccessResponse | PendingPasswordResponse }
  'POST /api/v1/auth/verify-password': { request: VerifyPasswordBody; response: AuthSuccessResponse }
  'POST /api/v1/auth/refresh': { request: undefined; response: AuthSuccessResponse }
  'POST /api/v1/auth/logout': { request: undefined; response: DeleteResponse }
  'POST /api/v1/auth/ws-ticket': { request: undefined; response: WsAuthTicketResponse }
  'PATCH /api/v1/auth/profile': { request: UpdateProfileBody; response: UpdateProfileResponse }
  'POST /api/v1/auth/terminate-telegram': { request: undefined; response: DeleteResponse }
  'DELETE /api/v1/auth/account': { request: undefined; response: DeleteResponse }
  'GET /api/v1/parse/status': { request: undefined; response: ParseStatusResponse }
  'GET /api/v1/parse/dialogs': { request: undefined; response: ParseDialogsResponse }
  'POST /api/v1/parse/start': { request: StartParseBody; response: StartParseResponse }
  'DELETE /api/v1/parse/cancel': { request: undefined; response: DeleteResponse }
  'GET /api/v1/parse/history': { request: undefined; response: PaginatedResponse<ParseHistoryItem> }
  'DELETE /api/v1/parse/history': { request: undefined; response: ClearHistoryResponse }
  'DELETE /api/v1/parse/history/:jobId': { request: undefined; response: DeleteHistoryItemResponse }
  'GET /api/v1/stats/global': { request: undefined; response: GlobalStatsDto }
  'GET /api/v1/stats/chats': { request: undefined; response: PagedChatsResponse }
  'GET /api/v1/stats/chats/:chatId': { request: undefined; response: ChatStatsDto }
  'DELETE /api/v1/stats/chats/:chatId': { request: undefined; response: DeleteResponse }
  'GET /api/v1/stats/activity': { request: undefined; response: ActivityResponse }
}

export type ApiOperation = keyof ApiEndpointMap
export type ApiRequest<K extends ApiOperation> = ApiEndpointMap[K]['request']
export type ApiResponse<K extends ApiOperation> = ApiEndpointMap[K]['response']

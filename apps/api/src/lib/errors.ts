import type { ApiErrorCode, ApiErrorResponse } from '@tg-analyzer/shared'

/** An error that is safe to show to the client as-is. */
export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly retryAfter?: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const badRequest = (message = 'Request validation failed') => new ApiError(400, 'INVALID_REQUEST', message)
export const unauthorized = (code: ApiErrorCode = 'AUTH_UNAUTHORIZED', message = 'Unauthorized') =>
  new ApiError(401, code, message)
export const notFound = (code: ApiErrorCode = 'NOT_FOUND', message = 'Not found') => new ApiError(404, code, message)
export const conflict = (code: ApiErrorCode, message: string) => new ApiError(409, code, message)

export function toErrorResponse(error: unknown, requestId: string): { statusCode: number; body: ApiErrorResponse } {
  if (error instanceof ApiError) {
    return {
      statusCode: error.statusCode,
      body: {
        code: error.code,
        message: error.message,
        requestId,
        ...(error.retryAfter !== undefined ? { retryAfter: error.retryAfter } : {}),
      },
    }
  }

  const source = (typeof error === 'object' && error !== null ? error : {}) as {
    name?: string
    statusCode?: number
    code?: string
    validation?: unknown
  }

  if (source.name === 'ZodError' || source.validation) {
    return { statusCode: 400, body: { code: 'INVALID_REQUEST', message: 'Request validation failed', requestId } }
  }
  if (source.statusCode === 429) {
    return { statusCode: 429, body: { code: 'RATE_LIMITED', message: 'Too many requests', requestId } }
  }
  if (source.statusCode && source.statusCode >= 400 && source.statusCode < 500) {
    // Fastify's own client errors, e.g. malformed JSON or an oversized body.
    return { statusCode: source.statusCode, body: { code: 'INVALID_REQUEST', message: 'Invalid request', requestId } }
  }
  return { statusCode: 500, body: { code: 'INTERNAL_ERROR', message: 'Internal server error', requestId } }
}

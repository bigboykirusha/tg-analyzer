import type { ApiErrorResponse, AuthErrorCode } from '@tg-analyzer/shared'
import type { FastifyReply } from 'fastify'

export class ApiError extends Error {
  statusCode: number
  code?: AuthErrorCode | string

  constructor(statusCode: number, message: string, code?: AuthErrorCode | string) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
  }
}

export function createApiError(statusCode: number, message: string, code?: AuthErrorCode | string) {
  return new ApiError(statusCode, message, code)
}

export function sendApiError(reply: FastifyReply, statusCode: number, message: string, code?: AuthErrorCode | string) {
  return reply.status(statusCode).send({
    message,
    code: code ?? `HTTP_${statusCode}`,
    requestId: reply.request.id,
  } satisfies ApiErrorResponse)
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}

export function serializeApiError(rawError: unknown, requestId: string) {
  const error =
    typeof rawError === 'object' && rawError !== null
      ? (rawError as { name?: string; message?: string; statusCode?: number; code?: string; validation?: unknown[] })
      : {}
  const statusCode = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500
  const isValidationError = error.name === 'ZodError' || Array.isArray(error.validation)
  const responseStatus = isValidationError ? 400 : statusCode
  const message = isValidationError
    ? 'Request validation failed'
    : responseStatus >= 500
      ? 'Internal server error'
      : (error.message ?? 'Request failed')
  const code =
    responseStatus >= 500
      ? 'INTERNAL_ERROR'
      : isApiError(rawError) && rawError.code
        ? rawError.code
        : isValidationError
          ? 'INVALID_REQUEST'
          : typeof error.code === 'string'
            ? error.code
            : 'REQUEST_FAILED'

  return {
    statusCode: responseStatus,
    body: { message, code, requestId } satisfies ApiErrorResponse,
  }
}

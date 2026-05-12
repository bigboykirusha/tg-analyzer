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

export function sendApiError(
  reply: FastifyReply,
  statusCode: number,
  message: string,
  code?: AuthErrorCode | string,
) {
  return reply.status(statusCode).send({
    message,
    code,
  } satisfies ApiErrorResponse)
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}

import type {
  ApiErrorCode,
  AuthSuccessResponse,
  SendCodeResponse,
  SuccessResponse,
  UserResponse,
  VerifyCodeResponse,
  WsTicketResponse,
} from '@tg-analyzer/shared'
import {
  sendCodeBodySchema,
  updateProfileBodySchema,
  verifyCodeBodySchema,
  verifyPasswordBodySchema,
} from '@tg-analyzer/shared'
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'
import { config, REFRESH_COOKIE_NAME } from '../../config'
import { parse } from '../../http/validation'
import { ApiError, badRequest, notFound, unauthorized } from '../../lib/errors'
import { telegram, TelegramFloodWaitError, TelegramLoginError, type TelegramUser } from '../../telegram'
import type { TelegramLoginErrorReason } from '../../telegram/errors'
import { deleteAccount } from '../account/account.service'
import { withUserTelegram } from '../account/telegram-access'
import {
  deactivateTelegramSession,
  getTelegramSession,
  logOutTelegramSession,
  saveTelegramSession,
} from '../account/telegram-sessions'
import { findUser, toUserDto, updateUserTimezone, upsertTelegramUser } from '../account/users'
import { requireAuth, userIdOf } from './guard'
import { clearRefreshCookie, setRefreshCookie } from './cookies'
import {
  clearPendingCode,
  clearPendingPassword,
  readPendingCode,
  readPendingPassword,
  savePendingCode,
  savePendingPassword,
} from './login-state'
import {
  createRefreshSession,
  hasOtherActiveFamily,
  revokeRefreshFamily,
  rotateRefreshSession,
} from './refresh-sessions'
import { signToken, verifyToken, type TokenClaims } from './tokens'
import { issueWsTicket } from './ws-tickets'

// Login attempts are strict. Refresh and session operations have their own,
// larger buckets so that finishing a login never exhausts the refresh budget.
const rateLimit = (scope: string, max: number) => ({
  rateLimit: {
    max,
    timeWindow: config.AUTH_RATE_LIMIT_WINDOW,
    keyGenerator: (request: FastifyRequest) => `${scope}:${request.ip}`,
  },
})
export const LOGIN_RATE_LIMIT = rateLimit('login', config.AUTH_RATE_LIMIT_MAX)
export const SESSION_RATE_LIMIT_MAX = Math.max(30, config.AUTH_RATE_LIMIT_MAX * 6)
const REFRESH_RATE_LIMIT = rateLimit('refresh', SESSION_RATE_LIMIT_MAX)
const SESSION_RATE_LIMIT = rateLimit('session', SESSION_RATE_LIMIT_MAX)

const LOGIN_ERRORS: Record<TelegramLoginErrorReason, [number, ApiErrorCode, string]> = {
  phone_invalid: [400, 'LOGIN_PHONE_INVALID', 'This phone number is not registered in Telegram'],
  phone_banned: [403, 'LOGIN_PHONE_BANNED', 'This phone number is banned by Telegram'],
  code_invalid: [400, 'LOGIN_CODE_INVALID', 'The code is incorrect'],
  code_expired: [400, 'LOGIN_CODE_EXPIRED', 'The code has expired, request a new one'],
  password_invalid: [400, 'LOGIN_PASSWORD_INVALID', 'The password is incorrect'],
  session_expired: [401, 'LOGIN_SESSION_EXPIRED', 'The login attempt has expired, start again'],
}

const loginSessionExpired = () => new ApiError(...LOGIN_ERRORS.session_expired)

/** Runs a Telegram login step and converts its failures into API errors. */
async function loginStep<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (error) {
    if (error instanceof TelegramLoginError) throw new ApiError(...LOGIN_ERRORS[error.reason])
    if (error instanceof TelegramFloodWaitError) {
      throw new ApiError(429, 'TELEGRAM_FLOOD_WAIT', 'Telegram asked to wait before the next attempt', error.seconds)
    }
    throw error
  }
}

async function completeLogin(
  reply: FastifyReply,
  input: { phone: string; session: string; telegramUser: TelegramUser },
): Promise<AuthSuccessResponse> {
  const user = await upsertTelegramUser(input.telegramUser, input.phone)
  const previousSession = await saveTelegramSession(user.id, input.session)
  // Each login creates a new Telegram authorization; retire the one it replaces.
  if (previousSession && previousSession !== input.session) {
    void logOutTelegramSession(user.id, previousSession)
  }

  const refresh = await createRefreshSession(user.id)
  setRefreshCookie(reply, refresh)
  return {
    accessToken: signToken('access', { sub: user.id, familyId: refresh.familyId }),
    user: await toUserDto(user, true),
  }
}

function readRefreshClaims(request: FastifyRequest): TokenClaims | null {
  const token = request.cookies[REFRESH_COOKIE_NAME]
  if (!token) return null
  try {
    return verifyToken(token, 'refresh')
  } catch {
    return null
  }
}

function validTimeZone(value: string) {
  try {
    return Intl.DateTimeFormat('en-US', { timeZone: value }).resolvedOptions().timeZone
  } catch {
    throw badRequest('Invalid time zone')
  }
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/send-code', { config: LOGIN_RATE_LIMIT }, async (request): Promise<SendCodeResponse> => {
    const { phone } = parse(sendCodeBodySchema, request.body)
    const { phoneCodeHash, session } = await loginStep(() => telegram.login.sendCode(phone))
    await savePendingCode({ phone, phoneCodeHash, session })
    return { phoneCodeHash }
  })

  app.post('/verify-code', { config: LOGIN_RATE_LIMIT }, async (request, reply): Promise<VerifyCodeResponse> => {
    const { phone, code, phoneCodeHash } = parse(verifyCodeBodySchema, request.body)
    const pending = await readPendingCode(phoneCodeHash)
    if (!pending || pending.phone !== phone) throw loginSessionExpired()

    const result = await loginStep(() =>
      telegram.login.signIn({ session: pending.session, phone, phoneCodeHash, code }),
    )
    await clearPendingCode(phoneCodeHash)

    if (result.status === 'password_required') {
      const tempToken = await savePendingPassword({ phone, session: result.session })
      return { passwordRequired: true, tempToken, passwordHint: result.hint }
    }
    return completeLogin(reply, { phone, session: result.session, telegramUser: result.user })
  })

  app.post('/verify-password', { config: LOGIN_RATE_LIMIT }, async (request, reply): Promise<AuthSuccessResponse> => {
    const { tempToken, password } = parse(verifyPasswordBodySchema, request.body)
    const pending = await readPendingPassword(tempToken)
    if (!pending) throw loginSessionExpired()

    const result = await loginStep(() => telegram.login.checkPassword({ session: pending.session, password }))
    await clearPendingPassword(tempToken)
    return completeLogin(reply, { phone: pending.phone, session: result.session, telegramUser: result.user })
  })

  app.post('/refresh', { config: REFRESH_RATE_LIMIT }, async (request, reply): Promise<AuthSuccessResponse> => {
    const fail = (code: ApiErrorCode = 'AUTH_REFRESH_INVALID') => {
      clearRefreshCookie(reply)
      return unauthorized(code, 'Session expired, please sign in again')
    }

    const claims = readRefreshClaims(request)
    if (!claims?.sessionId) throw fail()

    const rotation = await rotateRefreshSession(claims.sessionId, claims.sub, claims.familyId)
    if (rotation.status === 'replayed') {
      request.log.warn({ userId: claims.sub }, 'refresh token replay detected; session family revoked')
      throw fail('AUTH_REFRESH_REPLAYED')
    }
    if (!('session' in rotation)) throw fail()

    const user = await findUser(claims.sub)
    if (!user) throw fail()

    setRefreshCookie(reply, rotation.session)
    return {
      accessToken: signToken('access', { sub: user.id, familyId: rotation.session.familyId }),
      user: await toUserDto(user),
    }
  })

  app.post('/logout', { config: SESSION_RATE_LIMIT }, async (request, reply): Promise<SuccessResponse> => {
    const claims = readRefreshClaims(request)
    clearRefreshCookie(reply)
    if (!claims) return { success: true }

    await revokeRefreshFamily(claims.familyId)
    // Signed out everywhere: the stored Telegram authorization is no longer needed.
    if (!(await hasOtherActiveFamily(claims.sub, claims.familyId))) {
      const session = await getTelegramSession(claims.sub)
      if (session) {
        await deactivateTelegramSession(claims.sub)
        void logOutTelegramSession(claims.sub, session)
      }
    }
    return { success: true }
  })

  app.post(
    '/ws-ticket',
    { config: SESSION_RATE_LIMIT, preHandler: requireAuth },
    async (request): Promise<WsTicketResponse> => {
      const { userId, familyId } = request.auth!
      return { ticket: await issueWsTicket({ sub: userId, familyId }) }
    },
  )

  app.patch('/profile', { preHandler: requireAuth }, async (request): Promise<UserResponse> => {
    const { timezone } = parse(updateProfileBodySchema, request.body)
    const user = await updateUserTimezone(userIdOf(request), validTimeZone(timezone))
    if (!user) throw notFound()
    return { user: await toUserDto(user) }
  })

  app.delete('/account', { preHandler: requireAuth }, async (request, reply): Promise<SuccessResponse> => {
    await deleteAccount(userIdOf(request))
    clearRefreshCookie(reply)
    return { success: true }
  })

  app.get('/avatar', { preHandler: requireAuth }, async (request, reply) => {
    const avatar = await withUserTelegram(userIdOf(request), (api) => api.downloadAvatar(null), { waitMs: 3_000 })
    if (!avatar) throw notFound()
    return reply.header('Content-Type', 'image/jpeg').header('Cache-Control', 'private, max-age=3600').send(avatar)
  })
}

import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import { Api } from 'telegram'
import { z } from 'zod'
import type { UpdateProfileResponse, WsAuthTicketResponse } from '@tg-analyzer/shared'
import { and, eq } from 'drizzle-orm'
import { config, cookieName } from '../config'
import { db, schema } from '../db'
import { requireAuth } from '../middleware/auth.middleware'
import { deleteAccount } from '../services/account.service'
import { createApiError, sendApiError } from '../services/api-error.service'
import { encryptSession } from '../services/crypto.service'
import {
  clearRefreshCookie,
  issueAccessToken,
  issueAuthTokens,
  setRefreshCookie,
} from '../services/jwt.service'
import { redis } from '../services/redis.service'
import {
  clearPendingPasswordContext,
  deactivateTelegramSessions,
  getPendingPasswordContext,
  revokeRefreshSession,
  revokeRefreshSessionFamilyByTokenId,
  rotateRefreshSession,
  savePendingPasswordContext,
  upsertTelegramSession,
} from '../services/session.service'
import {
  exportSession,
  isTelegramSessionDuplicatedError,
  getTelegramUserData,
  isTelegramSessionExpiredError,
  isTelegramSessionBusyError,
  signInWithCode,
  signInWithPassword,
  telegramPool,
  withTelegramReconnectRetry,
} from '../services/telegram.service'
import { verifyToken, type TokenClaims } from '../services/token.service'
import { issueWsTicket } from '../services/ws-ticket.service'

const phoneField = z.string().regex(/^\+?[1-9]\d{4,19}$/)
const phoneSchema = z.object({
  phone: phoneField,
})

const verifyCodeSchema = z.object({
  phone: phoneField,
  code: z.string().regex(/^\d{3,10}$/),
  phoneCodeHash: z.string().min(1).max(256),
})

const verifyPasswordSchema = z.object({
  password: z.string().min(1).max(1024),
})

const updateProfileSchema = z.object({
  timezone: z.string().min(1).max(64),
})

const authRateLimitConfig = {
  rateLimit: {
    max: config.AUTH_RATE_LIMIT_MAX,
    timeWindow: config.AUTH_RATE_LIMIT_WINDOW,
  },
} as const

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/send-code', { config: authRateLimitConfig }, async (request) => {
    const { phone } = phoneSchema.parse(request.body)
    const phoneCodeHash = await telegramPool.createPendingClient(phone).catch((error) => {
      throwAuthError(error, 'Could not send Telegram code')
    })
    return { phoneCodeHash }
  })

  fastify.post('/verify-code', { config: authRateLimitConfig }, async (request, reply) => {
    const { phone, code, phoneCodeHash } = verifyCodeSchema.parse(request.body)
    const result = await signInWithCode(phone, code, phoneCodeHash).catch((error) => {
      throwAuthError(error, 'Invalid Telegram code')
    })

    if (result.needsPassword) {
      const tempToken = await savePendingPasswordContext({
        phone,
        phoneCodeHash,
        createdAt: new Date().toISOString(),
      })

      await telegramPool.rekeyPendingClient(phoneCodeHash, tempToken)

      return reply.send({
        isPasswordRequired: true,
        tempToken,
      })
    }

    const authResult = await finalizeTelegramAuth(phoneCodeHash, reply)
    return reply.send(authResult)
  })

  fastify.post('/verify-password', { config: authRateLimitConfig }, async (request, reply) => {
    const tempToken = request.headers.authorization?.replace(/^Bearer\s+/i, '')
    if (!tempToken) {
      return sendApiError(reply, 401, 'Missing temp token', 'AUTH_TEMP_TOKEN_INVALID')
    }

    const context = await getPendingPasswordContext(tempToken)
    if (!context) {
      await telegramPool.abortPendingClient(tempToken)
      return sendApiError(reply, 401, 'Temp token expired', 'AUTH_TEMP_TOKEN_INVALID')
    }

    const { password } = verifyPasswordSchema.parse(request.body)
    await signInWithPassword(tempToken, password).catch((error) => {
      throwAuthError(error, 'Invalid Telegram password')
    })
    await clearPendingPasswordContext(tempToken)

    const authResult = await finalizeTelegramAuth(tempToken, reply)
    return reply.send(authResult)
  })

  fastify.post('/refresh', { config: authRateLimitConfig }, async (request, reply) => {
    const token = request.cookies[cookieName]
    if (!token) {
      request.log.warn('refresh cookie missing')
      clearRefreshCookie(reply)
      return sendApiError(reply, 401, 'Refresh cookie missing', 'AUTH_REFRESH_INVALID')
    }

    let payload: TokenClaims
    try {
      payload = verifyToken(token, 'refresh')
    } catch {
      request.log.warn('invalid refresh token')
      clearRefreshCookie(reply)
      return sendApiError(reply, 401, 'Invalid refresh token', 'AUTH_REFRESH_INVALID')
    }

    const stored = await db.query.refreshSessions.findFirst({ where: eq(schema.refreshSessions.tokenId, payload.sessionId!) })
    if (!stored || stored.userId !== payload.sub || stored.familyId !== payload.familyId) {
      clearRefreshCookie(reply)
      return sendApiError(reply, 401, 'Refresh session invalid', 'AUTH_REFRESH_INVALID')
    }
    const rotation = await rotateRefreshSession(payload.sessionId!)
    if (rotation.status === 'invalid') {
      request.log.warn('refresh session invalid')
      clearRefreshCookie(reply)
      return sendApiError(reply, 401, 'Refresh session invalid', 'AUTH_REFRESH_INVALID')
    }
    if (rotation.status === 'replayed') {
      request.log.warn('refresh session replay detected')
      clearRefreshCookie(reply)
      return sendApiError(reply, 401, 'Refresh session replay detected', 'AUTH_REFRESH_REPLAYED')
    }
    if (!('session' in rotation)) {
      request.log.warn('refresh session missing after rotation')
      clearRefreshCookie(reply)
      return sendApiError(reply, 401, 'Refresh session invalid', 'AUTH_REFRESH_INVALID')
    }

    const session = rotation.session
    if (session.userId !== payload.sub) {
      request.log.warn('refresh session user mismatch')
      await revokeRefreshSession(payload.sessionId!)
      clearRefreshCookie(reply)
      return sendApiError(reply, 401, 'Refresh session invalid', 'AUTH_REFRESH_INVALID')
    }

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, session.userId),
    })
    if (!user) {
      request.log.warn('refresh user not found')
      clearRefreshCookie(reply)
      return sendApiError(reply, 401, 'User not found', 'AUTH_REFRESH_INVALID')
    }

    setRefreshCookie(reply, session.tokenId, user.id, session.familyId)
    const result = await issueAccessToken(user, session.familyId)
    return reply.send(result)
  })

  fastify.post('/logout', { config: authRateLimitConfig }, async (request, reply) => {
    const refreshToken = request.cookies[cookieName]
    if (refreshToken) {
      let payload: TokenClaims | null = null
      try {
        payload = verifyToken(refreshToken, 'refresh')
      } catch {
        // Invalid cookies are simply cleared.
      }
      if (payload?.sessionId) {
        await revokeRefreshSessionFamilyByTokenId(payload.sessionId)
      }
    }

    clearRefreshCookie(reply)
    return reply.send({ success: true })
  })

  fastify.post('/ws-ticket', { config: authRateLimitConfig, preHandler: requireAuth }, async (request) => {
    const ticket = await issueWsTicket({ sub: request.authUserId!, familyId: request.authFamilyId! }, redis)
    return { ticket } satisfies WsAuthTicketResponse
  })

  fastify.patch('/profile', { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.authUserId!
    const payload = updateProfileSchema.parse(request.body ?? {})
    const timezone = validateTimeZone(payload.timezone)
    const telegramSession = await db.query.telegramSessions.findFirst({
      where: and(eq(schema.telegramSessions.userId, userId), eq(schema.telegramSessions.isActive, true)),
    })

    const [user] = await db
      .update(schema.users)
      .set({ timezone })
      .where(eq(schema.users.id, userId))
      .returning()

    if (!user) {
      return sendApiError(reply, 404, 'User not found')
    }

    return reply.send({
      user: {
        id: user.id,
        tgUserId: String(user.tgUserId),
        username: user.username,
        firstName: user.firstName,
        timezone: user.timezone,
        telegramSessionActive: telegramSession?.isActive ?? false,
      },
    } satisfies UpdateProfileResponse)
  })

  fastify.post('/terminate-telegram', { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.authUserId!
    const session = await db.query.telegramSessions.findFirst({
      where: and(eq(schema.telegramSessions.userId, userId), eq(schema.telegramSessions.isActive, true)),
    })

    if (session) {
      try {
        const client = await telegramPool.connectAuthorizedClient(userId, session)
        await client.invoke(new Api.auth.LogOut())
        await telegramPool.disconnectAuthorizedClient(userId)
      } catch (error) {
        if (!isTelegramSessionExpiredError(error) && !isTelegramSessionBusyError(error)) {
          request.log.warn('telegram logout failed')
        }
      } finally {
        await telegramPool.disconnectAuthorizedClient(userId)
      }
    }

    await deactivateTelegramSessions(userId)
    return reply.send({ success: true })
  })

  fastify.get('/avatar', { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.authUserId!
    const session = await db.query.telegramSessions.findFirst({
      where: and(eq(schema.telegramSessions.userId, userId), eq(schema.telegramSessions.isActive, true)),
    })

    if (!session) {
      return sendApiError(reply, 401, 'Telegram session expired', 'TELEGRAM_REAUTH_REQUIRED')
    }

    let avatar: Buffer | null = null
    try {
      avatar = await withTelegramReconnectRetry(async () => {
        const client = await telegramPool.connectAuthorizedClient(userId, session)
        return telegramPool.getSelfAvatar(userId, client)
      }, async () => {
        await telegramPool.disconnectAuthorizedClient(userId)
      })
    } catch (error) {
      if (isTelegramSessionExpiredError(error)) {
        await deactivateTelegramSessions(userId)
        await telegramPool.disconnectAuthorizedClient(userId)
        return sendApiError(reply, 401, 'Telegram session expired', 'TELEGRAM_REAUTH_REQUIRED')
      }
      if (isTelegramSessionDuplicatedError(error) || isTelegramSessionBusyError(error)) {
        await telegramPool.disconnectAuthorizedClient(userId)
        return reply.status(409).send({ message: 'Telegram session is busy with another operation' })
      }
      throw error
    } finally {
      await telegramPool.disconnectAuthorizedClient(userId)
    }

    if (!avatar) {
      return reply.status(404).send({ message: 'Avatar not found' })
    }

    reply.header('Content-Type', 'image/jpeg')
    reply.header('Cache-Control', 'private, max-age=3600')
    return reply.send(avatar)
  })

  fastify.delete('/account', { preHandler: requireAuth }, async (request, reply) => {
    const userId = request.authUserId!
    await deleteAccount(userId)
    clearRefreshCookie(reply)
    return reply.send({ success: true })
  })
}

async function finalizeTelegramAuth(phoneCodeHash: string, reply: FastifyReply) {
  const pending = await telegramPool.finalizePendingClient(phoneCodeHash)
  if (!pending) {
    throw createApiError(401, 'Telegram auth session not found', 'AUTH_TEMP_TOKEN_INVALID')
  }

  try {
    const me = await getTelegramUserData(pending.client)
    const tgUserId = typeof me.id === 'number' ? me.id : Number(me.id.value)

    const values = {
      tgUserId,
      tgPhone: pending.phone,
      username: me.username ?? null,
      firstName: me.firstName ?? null,
      lastLogin: new Date(),
    }
    const [user] = await db
      .insert(schema.users)
      .values(values)
      .onConflictDoUpdate({ target: schema.users.tgUserId, set: values })
      .returning()
    if (!user) {
      throw new Error('User persistence failed')
    }

    const sessionString = exportSession(pending.client)
    const encrypted = encryptSession(sessionString)
    await upsertTelegramSession({
      userId: user.id,
      encrypted: encrypted.encrypted,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
    })

    return issueAuthTokens(reply, user, true)
  } finally {
    await pending.client.disconnect().catch(() => undefined)
  }
}

function throwAuthError(error: unknown, fallbackMessage: string): never {
  const message = error instanceof Error ? error.message : String(error)
  const statusCode = /expired|not found/i.test(message) ? 401 : 400
  throw createApiError(statusCode, fallbackMessage)
}

function validateTimeZone(value: string) {
  try {
    return Intl.DateTimeFormat('en-US', { timeZone: value }).resolvedOptions().timeZone
  } catch {
    throw createApiError(400, 'Invalid timezone')
  }
}

import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import { Api } from 'telegram'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import type { WsAuthTokenResponse } from '@tg-analyzer/shared'
import { and, eq } from 'drizzle-orm'
import {
  clearRefreshCookie,
  issueAccessToken,
  issueAuthTokens,
  setRefreshCookie,
} from '../services/jwt.service'
import { db, schema } from '../db'
import { createApiError, sendApiError } from '../services/api-error.service'
import { encryptSession } from '../services/crypto.service'
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
import { config, cookieName } from '../config'
import { requireAuth } from '../middleware/auth.middleware'

const phoneSchema = z.object({
  phone: z.string().min(5),
})

const verifyCodeSchema = z.object({
  phone: z.string().min(5),
  code: z.string().min(3),
  phoneCodeHash: z.string().min(1),
})

const verifyPasswordSchema = z.object({
  password: z.string().min(1),
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

  fastify.post('/refresh', async (request, reply) => {
    const token = request.cookies[cookieName]
    if (!token) {
      request.log.warn({ path: request.url }, 'refresh cookie missing')
      clearRefreshCookie(reply)
      return sendApiError(reply, 401, 'Refresh cookie missing', 'AUTH_REFRESH_INVALID')
    }

    let payload: { sub: string; sessionId: string }
    try {
      payload = jwt.verify(token, config.JWT_REFRESH_SECRET, { issuer: 'tg-analyzer' }) as { sub: string; sessionId: string }
    } catch {
      request.log.warn({ path: request.url }, 'invalid refresh token')
      clearRefreshCookie(reply)
      return sendApiError(reply, 401, 'Invalid refresh token', 'AUTH_REFRESH_INVALID')
    }

    const rotation = await rotateRefreshSession(payload.sessionId)
    if (rotation.status === 'invalid') {
      request.log.warn({ userId: payload.sub, sessionId: payload.sessionId }, 'refresh session invalid')
      clearRefreshCookie(reply)
      return sendApiError(reply, 401, 'Refresh session invalid', 'AUTH_REFRESH_INVALID')
    }
    if (rotation.status === 'replayed') {
      request.log.warn({ userId: payload.sub, sessionId: payload.sessionId }, 'refresh session replay detected')
      clearRefreshCookie(reply)
      return sendApiError(reply, 401, 'Refresh session replay detected', 'AUTH_REFRESH_REPLAYED')
    }
    if (!('session' in rotation)) {
      request.log.warn({ userId: payload.sub, sessionId: payload.sessionId }, 'refresh session missing after rotation')
      clearRefreshCookie(reply)
      return sendApiError(reply, 401, 'Refresh session invalid', 'AUTH_REFRESH_INVALID')
    }

    const session = rotation.session
    if (session.userId !== payload.sub) {
      request.log.warn({ expectedUserId: payload.sub, actualUserId: session.userId, sessionId: payload.sessionId }, 'refresh session user mismatch')
      await revokeRefreshSession(payload.sessionId)
      clearRefreshCookie(reply)
      return sendApiError(reply, 401, 'Refresh session invalid', 'AUTH_REFRESH_INVALID')
    }

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, session.userId),
    })
    if (!user) {
      request.log.warn({ userId: session.userId, sessionId: payload.sessionId }, 'refresh user not found')
      clearRefreshCookie(reply)
      return sendApiError(reply, 401, 'User not found', 'AUTH_REFRESH_INVALID')
    }

    setRefreshCookie(reply, session.tokenId, user.id)
    const result = await issueAccessToken(reply, user)
    return reply.send(result)
  })

  fastify.post('/logout', async (request, reply) => {
    const refreshToken = request.cookies[cookieName]
    if (refreshToken) {
      try {
        const payload = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET, { issuer: 'tg-analyzer' }) as { sub: string; sessionId: string }
        await revokeRefreshSessionFamilyByTokenId(payload.sessionId)
      } catch {
        // noop
      }
    }

    clearRefreshCookie(reply)
    return reply.send({ success: true })
  })

  fastify.get('/ws-token', { preHandler: requireAuth }, async (request) => {
    const token = jwt.sign(
      { sub: request.authUserId!, kind: 'ws' },
      config.JWT_SECRET,
      { expiresIn: '2m', issuer: 'tg-analyzer' },
    )

    return { token } satisfies WsAuthTokenResponse
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
          request.log.warn({ err: error }, 'telegram logout failed')
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
    await telegramPool.disconnectAuthorizedClient(userId)
    await db.delete(schema.users).where(eq(schema.users.id, userId))
    const refreshToken = request.cookies[cookieName]
    if (refreshToken) {
      try {
        const payload = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET, { issuer: 'tg-analyzer' }) as { sub: string; sessionId: string }
        await revokeRefreshSessionFamilyByTokenId(payload.sessionId)
      } catch {
        // noop
      }
    }
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

    let user = await db.query.users.findFirst({
      where: eq(schema.users.tgUserId, tgUserId),
    })

    if (!user) {
      const [created] = await db
        .insert(schema.users)
        .values({
          tgUserId,
          tgPhone: pending.phone,
          username: me.username ?? null,
          firstName: me.firstName ?? null,
          lastLogin: new Date(),
        })
        .returning()
      user = created
    } else {
      const [updated] = await db
        .update(schema.users)
        .set({
          tgPhone: pending.phone,
          username: me.username ?? null,
          firstName: me.firstName ?? null,
          lastLogin: new Date(),
        })
        .where(eq(schema.users.id, user.id))
        .returning()
      user = updated
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

import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import { Api } from 'telegram'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import {
  clearRefreshCookie,
  issueAuthTokens,
} from '../services/jwt.service'
import { db, schema } from '../db'
import { encryptSession } from '../services/crypto.service'
import {
  clearPendingPasswordContext,
  consumeRefreshSession,
  deactivateTelegramSessions,
  getPendingPasswordContext,
  revokeRefreshSession,
  savePendingPasswordContext,
  upsertTelegramSession,
} from '../services/session.service'
import {
  exportSession,
  getTelegramUserData,
  isTelegramSessionExpiredError,
  signInWithCode,
  signInWithPassword,
  telegramPool,
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

      telegramPool.rekeyPendingClient(phoneCodeHash, tempToken)

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
      return reply.status(401).send({ message: 'Missing temp token' })
    }

    const context = await getPendingPasswordContext(tempToken)
    if (!context) {
      await telegramPool.abortPendingClient(tempToken)
      return reply.status(401).send({ message: 'Temp token expired' })
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
      return reply.status(401).send({ message: 'Refresh cookie missing' })
    }

    try {
      const payload = jwt.verify(token, config.JWT_REFRESH_SECRET, { issuer: 'tg-analyzer' }) as { sub: string; sessionId: string }
      const session = await consumeRefreshSession(payload.sessionId)
      if (!session || session.userId !== payload.sub) {
        clearRefreshCookie(reply)
        return reply.status(401).send({ message: 'Refresh session invalid' })
      }

      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, payload.sub),
      })
      if (!user) {
        clearRefreshCookie(reply)
        return reply.status(401).send({ message: 'User not found' })
      }

      const result = await issueAuthTokens(reply, user)
      return reply.send(result)
    } catch {
      clearRefreshCookie(reply)
      return reply.status(401).send({ message: 'Invalid refresh token' })
    }
  })

  fastify.post('/logout', { preHandler: requireAuth }, async (request, reply) => {
    const refreshToken = request.cookies[cookieName]
    if (refreshToken) {
      try {
        const payload = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET, { issuer: 'tg-analyzer' }) as { sub: string; sessionId: string }
        await revokeRefreshSession(payload.sessionId)
      } catch {
        // noop
      }
    }

    clearRefreshCookie(reply)
    return reply.send({ success: true })
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
        if (!isTelegramSessionExpiredError(error)) {
          request.log.warn({ err: error }, 'telegram logout failed')
        }
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
      return reply.status(404).send({ message: 'Active Telegram session not found' })
    }

    let avatar: Buffer | null = null
    try {
      const client = await telegramPool.connectAuthorizedClient(userId, session)
      avatar = await telegramPool.getSelfAvatar(userId, client)
    } catch (error) {
      if (isTelegramSessionExpiredError(error)) {
        await deactivateTelegramSessions(userId)
        await telegramPool.disconnectAuthorizedClient(userId)
        return reply.status(401).send({ message: 'Telegram session expired' })
      }
      throw error
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
    clearRefreshCookie(reply)
    return reply.send({ success: true })
  })
}

async function finalizeTelegramAuth(phoneCodeHash: string, reply: FastifyReply) {
  const pending = await telegramPool.finalizePendingClient(phoneCodeHash)
  if (!pending) {
    throw new Error('Telegram auth session not found')
  }

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
}

function throwAuthError(error: unknown, fallbackMessage: string): never {
  const message = error instanceof Error ? error.message : String(error)
  const statusCode = /expired|not found/i.test(message) ? 401 : 400
  const authError = new Error(fallbackMessage)
  ;(authError as Error & { statusCode: number }).statusCode = statusCode
  throw authError
}

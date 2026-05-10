import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { addDays } from '../utils/date'
import { cookieName, config } from '../config'
import { db, schema } from '../db'
import { eq } from 'drizzle-orm'
import type { FastifyReply } from 'fastify'
import type { UserDto } from '@tg-analyzer/shared'

export interface AccessPayload {
  sub: string
  tgUserId: string
  username: string | null
}

export interface RefreshPayload {
  sub: string
  sessionId: string
}

export function toUserDto(user: {
  id: string
  tgUserId: number
  username: string | null
  firstName: string | null
}, telegramSessionActive?: boolean): UserDto {
  return {
    id: user.id,
    tgUserId: String(user.tgUserId),
    username: user.username,
    firstName: user.firstName,
    telegramSessionActive,
  }
}

export async function issueAuthTokens(reply: FastifyReply, user: {
  id: string
  tgUserId: number
  username: string | null
  firstName: string | null
}, telegramSessionActiveOverride?: boolean) {
  const telegramSession = await db.query.telegramSessions.findFirst({
    where: eq(schema.telegramSessions.userId, user.id),
  })
  const sessionId = randomUUID()
  const accessToken = await reply.jwtSign(
    {
      sub: user.id,
      tgUserId: String(user.tgUserId),
      username: user.username,
    } satisfies AccessPayload,
    { expiresIn: '15m' },
  )

  await db.insert(schema.refreshSessions).values({
    userId: user.id,
    tokenId: sessionId,
    expiresAt: addDays(new Date(), 30),
  })

  setRefreshCookie(reply, sessionId, user.id)
  return { accessToken, user: toUserDto(user, telegramSessionActiveOverride ?? telegramSession?.isActive ?? false) }
}

export function setRefreshCookie(reply: FastifyReply, sessionId: string, userId: string) {
  const token = jwt.sign(
    { sub: userId, sessionId } satisfies RefreshPayload,
    config.JWT_REFRESH_SECRET,
    { expiresIn: '30d', issuer: 'tg-analyzer' },
  )
  reply.setCookie(cookieName, token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    secure: config.COOKIE_SECURE,
    expires: addDays(new Date(), 30),
  })
}

export function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie(cookieName, {
    path: '/',
    httpOnly: true,
    sameSite: 'strict',
    secure: config.COOKIE_SECURE,
  })
}

import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { addDays } from '../utils/date'
import { cookieName, config } from '../config'
import { db, schema } from '../db'
import { eq } from 'drizzle-orm'
import type { FastifyReply } from 'fastify'
import type { CookieSerializeOptions } from '@fastify/cookie'
import type { UserDto } from '@tg-analyzer/shared'
import { createRefreshSession } from './session.service'

export interface AccessPayload {
  sub: string
  tgUserId: string
  username: string | null
}

export interface RefreshPayload {
  sub: string
  sessionId: string
}

function getRefreshCookieOptions(): CookieSerializeOptions {
  return {
    httpOnly: true,
    sameSite: config.COOKIE_SAME_SITE,
    path: '/',
    secure: config.COOKIE_SECURE,
    domain: config.COOKIE_DOMAIN,
  }
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
  const refreshSession = await createRefreshSession(user.id)
  setRefreshCookie(reply, refreshSession.tokenId, user.id)
  return issueAccessToken(reply, user, telegramSessionActiveOverride)
}

export async function issueAccessToken(reply: FastifyReply, user: {
  id: string
  tgUserId: number
  username: string | null
  firstName: string | null
}, telegramSessionActiveOverride?: boolean) {
  const telegramSession = await db.query.telegramSessions.findFirst({
    where: eq(schema.telegramSessions.userId, user.id),
  })
  const accessToken = await reply.jwtSign(
    {
      sub: user.id,
      tgUserId: String(user.tgUserId),
      username: user.username,
    } satisfies AccessPayload,
    { expiresIn: '30d' },
  )

  return { accessToken, user: toUserDto(user, telegramSessionActiveOverride ?? telegramSession?.isActive ?? false) }
}

export function setRefreshCookie(reply: FastifyReply, sessionId: string, userId: string) {
  const token = jwt.sign(
    { sub: userId, sessionId } satisfies RefreshPayload,
    config.JWT_REFRESH_SECRET,
    { expiresIn: '90d', issuer: 'tg-analyzer' },
  )
  reply.setCookie(cookieName, token, {
    ...getRefreshCookieOptions(),
    expires: addDays(new Date(), 90),
  })
}

export function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie(cookieName, {
    ...getRefreshCookieOptions(),
  })
}

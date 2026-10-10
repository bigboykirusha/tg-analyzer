import { signToken } from './token.service'
import { addDays } from '../utils/date'
import { cookieName, config } from '../config'
import { db, schema } from '../db'
import { eq } from 'drizzle-orm'
import type { FastifyReply } from 'fastify'
import type { CookieSerializeOptions } from '@fastify/cookie'
import type { UserDto } from '@tg-analyzer/shared'
import { createRefreshSession } from './session.service'

function getRefreshCookieOptions(): CookieSerializeOptions {
  return {
    httpOnly: true,
    sameSite: config.COOKIE_SAME_SITE,
    path: '/',
    secure: config.COOKIE_SECURE,
    domain: config.COOKIE_DOMAIN,
  }
}

export function toUserDto(
  user: {
    id: string
    tgUserId: number
    username: string | null
    firstName: string | null
    timezone: string
  },
  telegramSessionActive?: boolean,
): UserDto {
  return {
    id: user.id,
    tgUserId: String(user.tgUserId),
    username: user.username,
    firstName: user.firstName,
    timezone: user.timezone,
    telegramSessionActive,
  }
}

export async function issueAuthTokens(
  reply: FastifyReply,
  user: {
    id: string
    tgUserId: number
    username: string | null
    firstName: string | null
    timezone: string
  },
  telegramSessionActiveOverride?: boolean,
) {
  const refreshSession = await createRefreshSession(user.id)
  setRefreshCookie(reply, refreshSession.tokenId, user.id, refreshSession.familyId)
  return issueAccessToken(user, refreshSession.familyId, telegramSessionActiveOverride)
}

export async function issueAccessToken(
  user: {
    id: string
    tgUserId: number
    username: string | null
    firstName: string | null
    timezone: string
  },
  familyId: string,
  telegramSessionActiveOverride?: boolean,
) {
  const telegramSession = await db.query.telegramSessions.findFirst({
    where: eq(schema.telegramSessions.userId, user.id),
  })
  const accessToken = signToken('access', { sub: user.id, familyId })

  return { accessToken, user: toUserDto(user, telegramSessionActiveOverride ?? telegramSession?.isActive ?? false) }
}

export function setRefreshCookie(reply: FastifyReply, sessionId: string, userId: string, familyId: string) {
  const token = signToken('refresh', { sub: userId, sessionId, familyId })
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

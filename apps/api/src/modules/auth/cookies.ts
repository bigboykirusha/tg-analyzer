import type { CookieSerializeOptions } from '@fastify/cookie'
import type { FastifyReply } from 'fastify'
import { config, REFRESH_COOKIE_NAME } from '../../config'
import { addMs, DAY_MS } from '../../lib/time'
import { REFRESH_TOKEN_TTL_DAYS, signToken } from './tokens'

const baseOptions = (): CookieSerializeOptions => ({
  httpOnly: true,
  sameSite: config.COOKIE_SAME_SITE,
  secure: config.COOKIE_SECURE,
  domain: config.COOKIE_DOMAIN,
  path: '/',
})

export function setRefreshCookie(reply: FastifyReply, session: { userId: string; tokenId: string; familyId: string }) {
  const token = signToken('refresh', { sub: session.userId, sessionId: session.tokenId, familyId: session.familyId })
  reply.setCookie(REFRESH_COOKIE_NAME, token, {
    ...baseOptions(),
    expires: addMs(new Date(), REFRESH_TOKEN_TTL_DAYS * DAY_MS),
  })
}

export function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie(REFRESH_COOKIE_NAME, baseOptions())
}

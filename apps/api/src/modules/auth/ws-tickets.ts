import { randomBytes } from 'node:crypto'
import { z } from 'zod'
import { redis } from '../../lib/redis'

/**
 * Browsers cannot send headers with a WebSocket handshake, so the client
 * exchanges its access token for a short-lived, single-use ticket instead.
 */

const TICKET_TTL_SECONDS = 30
const TICKET_PATTERN = /^[A-Za-z0-9_-]{43}$/
const claimsSchema = z.object({ sub: z.uuid(), familyId: z.uuid() })

export type WsTicketClaims = z.infer<typeof claimsSchema>

const key = (ticket: string) => `auth:ws-ticket:${ticket}`

export async function issueWsTicket(claims: WsTicketClaims): Promise<string> {
  const ticket = randomBytes(32).toString('base64url')
  await redis.set(key(ticket), JSON.stringify(claims), 'EX', TICKET_TTL_SECONDS)
  return ticket
}

export async function consumeWsTicket(ticket: string): Promise<WsTicketClaims | null> {
  if (!TICKET_PATTERN.test(ticket)) return null
  const value = await redis.getdel(key(ticket))
  if (!value) return null
  try {
    const parsed = claimsSchema.safeParse(JSON.parse(value))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

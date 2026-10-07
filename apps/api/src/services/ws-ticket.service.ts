import { randomBytes } from 'node:crypto'
import { z } from 'zod'

const TICKET_TTL_SECONDS = 30
const ticketClaimsSchema = z.object({
  sub: z.uuid(),
  familyId: z.uuid(),
})

export type WsTicketClaims = z.infer<typeof ticketClaimsSchema>
type TicketRedis = {
  set(key: string, value: string, mode: 'EX', seconds: number, condition: 'NX'): Promise<unknown>
  call(command: string, ...args: string[]): Promise<unknown>
}

export async function issueWsTicket(claims: WsTicketClaims, store: TicketRedis): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const ticket = randomBytes(32).toString('base64url')
    const stored = await store.set(`auth:ws-ticket:${ticket}`, JSON.stringify(claims), 'EX', TICKET_TTL_SECONDS, 'NX')
    if (stored === 'OK') return ticket
  }
  throw new Error('Could not issue websocket ticket')
}

export async function consumeWsTicket(ticket: string, store: TicketRedis): Promise<WsTicketClaims | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(ticket)) return null
  const value = await store.call('GETDEL', `auth:ws-ticket:${ticket}`)
  if (typeof value !== 'string') return null
  try {
    const parsed = ticketClaimsSchema.safeParse(JSON.parse(value))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

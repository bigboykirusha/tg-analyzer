import test from 'node:test'
import assert from 'node:assert/strict'
import { consumeWsTicket, issueWsTicket } from './ws-ticket.service'

function createTicketStore() {
  const values = new Map<string, string>()
  const expirations = new Map<string, number>()
  return {
    async set(key: string, value: string, _mode: 'EX', seconds: number, _condition: 'NX') {
      values.set(key, value)
      expirations.set(key, Date.now() + seconds * 1000)
      return 'OK'
    },
    async call(_command: 'GETDEL', key: string) {
      const value = values.get(key)
      values.delete(key)
      if (expirations.get(key)! <= Date.now()) return null
      return value ?? null
    },
  }
}

test('websocket tickets are single-use and expire quickly', async () => {
  const claims = { sub: 'f9a842e4-319f-4a51-b14f-2794d5b631f1', familyId: '90bd194c-b23f-4d76-a194-0f5967c1161d' }
  const store = createTicketStore()
  const ticket = await issueWsTicket(claims, store)
  assert.ok(ticket.length >= 32)
  assert.deepEqual(await consumeWsTicket(ticket, store), claims)
  assert.equal(await consumeWsTicket(ticket, store), null)
})

test('unknown websocket tickets cannot authenticate', async () => {
  assert.equal(await consumeWsTicket('not-a-ticket', createTicketStore()), null)
})

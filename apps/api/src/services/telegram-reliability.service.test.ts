import test from 'node:test'
import assert from 'node:assert/strict'
import {
  refreshOwnedLease,
  releaseOwnedLease,
  TelegramSessionRevokedError,
  withFloodWaitRetry,
} from './telegram-reliability.service'

test('FLOOD_WAIT can be interrupted before the retry delay completes', async () => {
  let calls = 0
  await assert.rejects(
    withFloodWaitRetry(
      async () => {
        calls += 1
        throw Object.assign(new Error('FLOOD_WAIT_60'), { seconds: 60 })
      },
      2,
      {
        assertContinue: async () => {
          throw new Error('cancelled')
        },
      },
    ),
    /cancelled/,
  )
  assert.equal(calls, 1)
})

test('SESSION_REVOKED is surfaced as a typed terminal error', async () => {
  await assert.rejects(
    withFloodWaitRetry(async () => {
      throw new Error('SESSION_REVOKED')
    }),
    TelegramSessionRevokedError,
  )
})

test('lease refresh and release are compare-and-set operations', async () => {
  const calls: Array<{ script: string; keys: number; args: string[] }> = []
  const store = {
    async eval(script: string, keys: number, ...args: string[]) {
      calls.push({ script, keys, args })
      return 1
    },
  }

  assert.equal(await refreshOwnedLease(store, 'lease:key', 'owner', 5000), true)
  assert.equal(await releaseOwnedLease(store, 'lease:key', 'owner'), true)
  assert.equal(calls.length, 2)
  assert.ok(calls[0]?.script.includes("redis.call('pexpire'"))
  assert.ok(calls[1]?.script.includes("redis.call('del'"))
  assert.deepEqual(calls[0]?.args, ['lease:key', 'owner', '5000'])
  assert.deepEqual(calls[1]?.args, ['lease:key', 'owner'])
})

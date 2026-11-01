import test from 'node:test'
import assert from 'node:assert/strict'
import { getEventListeners } from 'node:events'
import type { Redis } from 'ioredis'
import { sleep } from '../src/lib/time'
import { acquireSessionLease } from '../src/telegram/session-lease'

test('completed and aborted waits release their abort listeners', async () => {
  const controller = new AbortController()
  for (let index = 0; index < 15; index += 1) await sleep(1, controller.signal)
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0)
  const waiting = sleep(60_000, controller.signal)
  controller.abort()
  await waiting
  await sleep(60_000, controller.signal)
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0)
})

test('a stuck Redis renewal cannot keep an expired Telegram lease alive', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] })
  const redis = {
    set: async () => 'OK',
    eval: (script: string) => (script.includes('pexpire') ? new Promise(() => {}) : Promise.resolve(1)),
  } as unknown as Redis
  const lease = await acquireSessionLease(redis, 'test-user', 0)
  t.mock.timers.tick(119_999)
  assert.equal(lease.signal.aborted, false)
  t.mock.timers.tick(1)
  assert.equal(lease.signal.aborted, true)
  await lease.release()
})

test('a delayed lock response does not grant another full lease lifetime', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] })
  const redis = {
    set: async () => {
      t.mock.timers.tick(120_000)
      return 'OK'
    },
    eval: async () => 1,
  } as unknown as Redis
  const lease = await acquireSessionLease(redis, 'test-user', 0)
  assert.equal(lease.signal.aborted, true)
  await lease.release()
})

test('a renewal resolving after release cannot rearm the expiry timer', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] })
  let finishRenewal: (value: number) => void = () => {
    throw new Error('Renewal was not requested')
  }
  const redis = {
    set: async () => 'OK',
    eval: (script: string) =>
      script.includes('pexpire')
        ? new Promise<number>((resolve) => {
            finishRenewal = resolve
          })
        : Promise.resolve(1),
  } as unknown as Redis
  const lease = await acquireSessionLease(redis, 'test-user', 0)
  t.mock.timers.tick(30_000)
  await lease.release()
  finishRenewal(1)
  await Promise.resolve()
  t.mock.timers.tick(120_000)
  assert.equal(lease.signal.aborted, false)
})

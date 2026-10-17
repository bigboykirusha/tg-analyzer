import test from 'node:test'
import assert from 'node:assert/strict'
import type { PeopleOverviewDto } from '@tg-analyzer/shared'
import { ORIGIN, app, login, peopleJobs, processPeopleOverview, useTestServer } from './helpers'

useTestServer()

test('the first visit starts an overview of recent private chats', async () => {
  const session = await login()

  const first = await app.inject({ url: '/api/v1/people', headers: session.headers })
  assert.equal(first.statusCode, 200)
  assert.equal(first.json<PeopleOverviewDto>().status, 'running')
  assert.equal(await peopleJobs(), 1)

  // A second visit while it runs does not queue another job.
  await app.inject({ url: '/api/v1/people', headers: session.headers })
  assert.equal(await peopleJobs(), 1)

  await processPeopleOverview(session.userId)
  const ready = (await app.inject({ url: '/api/v1/people', headers: session.headers })).json<PeopleOverviewDto>()
  assert.equal(ready.status, 'ready')
  assert.ok(ready.computedAt)
  assert.ok(ready.contacts.length > 0)
  // Only private chats, busiest in the last 30 days first.
  const katya = ready.contacts.find((contact) => contact.title === 'Катя')
  assert.ok(katya)
  assert.ok(ready.contacts.every((contact) => !contact.chatId.startsWith('-')))
  for (let index = 1; index < ready.contacts.length; index += 1) {
    assert.ok(ready.contacts[index - 1]!.last30 >= ready.contacts[index]!.last30)
  }
})

test('refresh is explicit and requires a live Telegram session', async () => {
  const session = await login()
  const refreshed = await app.inject({
    method: 'POST',
    url: '/api/v1/people/refresh',
    headers: { ...session.headers, origin: ORIGIN },
  })
  assert.equal(refreshed.statusCode, 200)
  assert.equal(refreshed.json<PeopleOverviewDto>().status, 'running')

  const anonymous = await app.inject({ url: '/api/v1/people' })
  assert.equal(anonymous.statusCode, 401)
})

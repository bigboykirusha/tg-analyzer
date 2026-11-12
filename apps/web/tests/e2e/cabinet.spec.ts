import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { assertFakeTelegram, gotoHydrated, usePreferences } from './helpers'

// The signed-in screens get the checks the public ones have: no accessibility violations (WCAG A/AA) and a clean
// start — no hydration mismatch, no page error — in both themes. A private chat and a group are analysed first,
// so the report screens and the notifications have content.
test('signed-in pages render without accessibility violations or hydration errors', async ({
  context,
  page,
  baseURL,
}) => {
  test.setTimeout(240_000)
  await assertFakeTelegram(context)
  const phone = `+7900${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}1`
  const sent = await context.request.post('/api/v1/auth/send-code', { data: { phone } })
  expect(sent.ok()).toBe(true)
  const verified = await context.request.post('/api/v1/auth/verify-code', {
    data: { phone, code: '12345', phoneCodeHash: (await sent.json()).phoneCodeHash },
  })
  expect(verified.ok()).toBe(true)
  const headers = { Authorization: `Bearer ${(await verified.json()).accessToken}`, Origin: baseURL! }
  for (const chatId of ['1006', '-1002004']) {
    const started = await context.request.post('/api/v1/parse/start', { headers, data: { chatId } })
    expect(started.ok()).toBe(true)
  }
  await expect
    .poll(async () => (await (await context.request.get('/api/v1/reports', { headers })).json()).reports.length, {
      timeout: 60_000,
    })
    .toBe(2)

  const problems: string[] = []
  page.on('pageerror', (error) => problems.push(`page error: ${error.message}`))
  page.on('console', (message) => {
    if (/hydration/i.test(message.text())) problems.push(message.text().split('\n')[0]!)
  })
  for (const theme of ['light', 'dark'] as const) {
    await usePreferences(context, theme)
    for (const path of ['/dashboard', '/new', '/notifications', '/account', '/chat/1006', '/chat/-1002004']) {
      await gotoHydrated(page, path)
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeAttached()
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
      for (const violation of results.violations) problems.push(`${theme} ${path}: ${violation.id}`)
    }
  }
  expect(problems).toEqual([])
})

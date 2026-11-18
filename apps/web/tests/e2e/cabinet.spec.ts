import AxeBuilder from '@axe-core/playwright'
import { expect, test, type ConsoleMessage } from '@playwright/test'
import { assertFakeTelegram, gotoHydrated, usePreferences } from './helpers'

// The signed-in screens get the checks the public ones have: no accessibility violations (WCAG A/AA) and a clean
// start — no hydration mismatch, no page error — in both themes. A private chat and a group are analysed first,
// so the report screens and the notifications have content.
test('signed-in pages render without accessibility violations or hydration errors', async ({ context, baseURL }) => {
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
  for (const theme of ['light', 'dark'] as const) {
    await usePreferences(context, theme)
    for (const path of ['/dashboard', '/new', '/notifications', '/account', '/chat/1006', '/chat/-1002004']) {
      const page = await context.newPage()
      const onError = (error: Error) => problems.push(`${theme} ${path}: ${error.message}`)
      const onConsole = (message: ConsoleMessage) => {
        if (/hydration/i.test(message.text())) problems.push(`${theme} ${path}: ${message.text().split('\n')[0]}`)
      }
      page.on('pageerror', onError)
      page.on('console', onConsole)
      try {
        await gotoHydrated(page, path)
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeAttached()
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa'])
          // Contrast is checked by APCA on the tokens (scripts/check-contrast.mjs, 17.11).
          .disableRules(['color-contrast'])
          .analyze()
        for (const violation of results.violations) problems.push(`${theme} ${path}: ${violation.id}`)
      } finally {
        // WebKit can surface a canceled status poll as an error while the document unloads.
        page.off('pageerror', onError)
        page.off('console', onConsole)
        await page.close()
      }
    }
  }
  expect(problems).toEqual([])
})

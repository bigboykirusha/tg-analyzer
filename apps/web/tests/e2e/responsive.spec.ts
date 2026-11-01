import { expect, test, type BrowserContext, type TestInfo } from '@playwright/test'
import { gotoHydrated, noHorizontalScroll, usePreferences } from './helpers'

async function inspectPage(
  context: BrowserContext,
  width: number,
  path: string,
  locale: string,
  theme: string,
  testInfo: TestInfo,
) {
  const page = await context.newPage()
  const errors: string[] = []
  const onError = (error: Error) => errors.push(error.message)
  page.on('pageerror', onError)
  try {
    const heights: Record<number, number> = { 320: 800, 360: 800, 390: 844, 430: 932, 768: 1024, 844: 390, 1440: 900 }
    await page.setViewportSize({ width, height: heights[width] ?? 844 })
    await gotoHydrated(page, path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    expect(await noHorizontalScroll(page), `${path}, ${width}px`).toBe(true)
    if (width === 390 || width === 1440)
      await page.screenshot({
        path: testInfo.outputPath(`${path.replaceAll('/', '-') || 'home'}-${locale}-${theme}.png`),
        fullPage: true,
      })
    expect(errors).toEqual([])
  } finally {
    // Each case is a separate document. WebKit can report a cancelled lazy
    // Nuxt manifest fetch while unloading; it belongs to the closed document.
    page.off('pageerror', onError)
    await page.close()
  }
}

for (const locale of ['ru', 'en'] as const)
  for (const theme of ['light', 'dark'] as const) {
    test(`public pages fit phone widths in ${locale}, ${theme}`, async ({ context }, testInfo) => {
      test.skip(testInfo.project.name === 'desktop', 'Phone matrix runs in the mobile browser projects')
      test.setTimeout(150_000)
      await usePreferences(context, theme, locale)
      for (const width of [320, 360, 390, 430, 768, 844]) {
        for (const path of ['/', '/login', '/faq', '/terms', '/example']) {
          await inspectPage(context, width, path, locale, theme, testInfo)
        }
      }
    })

    test(`workspace pages fit phone widths in ${locale}, ${theme}`, async ({ context, baseURL }, testInfo) => {
      test.setTimeout(210_000)
      await usePreferences(context, theme, locale)
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
        .poll(
          async () => {
            const reports = await context.request.get('/api/v1/reports', { headers })
            return (await reports.json()).reports.length
          },
          { timeout: 30_000 },
        )
        .toBe(2)

      const widths = testInfo.project.name === 'desktop' ? [1440] : [320, 360, 390, 430, 768, 844]
      for (const width of widths) {
        for (const path of ['/dashboard', '/new', '/account', '/chat/1006', '/chat/-1002004']) {
          await inspectPage(context, width, path, locale, theme, testInfo)
        }
      }
    })
  }

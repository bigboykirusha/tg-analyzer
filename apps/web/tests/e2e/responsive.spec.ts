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
    if (path === '/dashboard' && width <= 640) {
      const header = await page.locator('.topbar').evaluate((element) => {
        const brand = element.querySelector('.topbar__brand')!.getBoundingClientRect()
        const action = element.querySelector('.home__new')!.getBoundingClientRect()
        const profile = element.querySelector('.account-trigger')!.getBoundingClientRect()
        return {
          brandRight: brand.right,
          actionLeft: action.left,
          actionRight: action.right,
          profileLeft: profile.left,
        }
      })
      expect(header.brandRight).toBeLessThanOrEqual(header.actionLeft)
      expect(header.actionRight).toBeLessThanOrEqual(header.profileLeft)
    }
    // A flex column must stretch every report card, even cards with short copy.
    // Root overflow checks alone miss this because shrunken cards still fit.
    if (width <= 900) {
      const widths = await page.locator('.report-columns').evaluateAll((columns) =>
        columns.flatMap((column) =>
          Array.from(column.children).map((card) => ({
            card: card.getBoundingClientRect().width,
            column: column.getBoundingClientRect().width,
          })),
        ),
      )
      for (const item of widths) expect(Math.abs(item.card - item.column)).toBeLessThan(1)
    }
    if (['/account', '/new'].includes(path) && width <= 640) {
      const controls = await page
        .locator(path === '/account' ? '.row .segmented' : '.picker-tools .segmented')
        .evaluateAll((elements) =>
          elements.map((element) =>
            Array.from(element.querySelectorAll('.segment')).map((segment) => segment.getBoundingClientRect().width),
          ),
        )
      for (const sizes of controls) expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThan(1)
    }
    if (width > 640 && width <= 900) {
      const pairs = await page.locator('.bento--split').evaluateAll((elements) =>
        elements.flatMap((element) => {
          const main = element.querySelector(':scope > .span-8')
          const accent = element.querySelector(':scope > .span-4')
          return main && accent ? [Math.abs(main.getBoundingClientRect().top - accent.getBoundingClientRect().top)] : []
        }),
      )
      for (const difference of pairs) expect(difference).toBeLessThan(1)
    }
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
    test(`public pages fit viewport widths in ${locale}, ${theme}`, async ({ context }, testInfo) => {
      test.setTimeout(240_000)
      await usePreferences(context, theme, locale)
      const widths = testInfo.project.name === 'desktop' ? [1440] : [320, 360, 390, 430, 768, 844]
      for (const width of widths) {
        for (const path of ['/', '/login', '/faq', '/terms', '/example', '/offline', '/not-found']) {
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

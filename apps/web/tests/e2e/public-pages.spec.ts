import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { gotoHydrated, noHorizontalScroll, openCard, usePreferences } from './helpers'

test('system dark theme and the browser language hydrate without a mismatch', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (/hydration.*mismatch/i.test(message.text())) errors.push(message.text())
  })
  await page.emulateMedia({ colorScheme: 'dark' })
  await gotoHydrated(page, '/login')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(errors).toEqual([])
})

// Every public page shares one frame, so all of them get the same checks.
for (const path of ['/', '/login', '/privacy', '/example'])
  for (const theme of ['light', 'dark'] as const) {
    test(`${path} renders without accessibility violations in ${theme}`, async ({ page, context }) => {
      const renderingErrors: string[] = []
      page.on('pageerror', (error) => renderingErrors.push(error.message))
      page.on('console', (message) => {
        if (/hydration.*mismatch/i.test(message.text())) renderingErrors.push(message.text())
      })
      await usePreferences(context, theme)
      await gotoHydrated(page, path)
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect.poll(() => noHorizontalScroll(page)).toBe(true)

      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
      expect(results.violations.map((violation) => violation.id)).toEqual([])
      expect(renderingErrors).toEqual([])
    })
  }

test('country picker filters and selects a country', async ({ page, context }) => {
  await usePreferences(context, 'light')
  await gotoHydrated(page, '/login')
  await page.getByRole('button', { name: 'Страна', exact: true }).click()
  await page.getByRole('option', { name: /\+995/ }).click()
  await expect(page.locator('.dial-code')).toContainText('+995')
  await page.locator('.phone-input').fill('555123456')
  await expect(page.getByRole('button', { name: 'Получить код' })).toBeEnabled()
})

test('the first visit speaks the browser language', async ({ browser, baseURL }) => {
  for (const [locale, button] of [
    ['en-US', 'Get code'],
    ['ru-RU', 'Получить код'],
  ] as const) {
    const context = await browser.newContext({ locale })
    try {
      const page = await context.newPage()
      await page.goto(new URL('/login', baseURL).toString())
      await expect(page.getByRole('button', { name: button })).toBeVisible()
      // The server chose and kept it: the cookie is set, so the client hydrates in the same language.
      expect((await context.cookies()).find((cookie) => cookie.name === 'tg-analyzer-locale')?.value).toBe(
        locale.slice(0, 2),
      )
    } finally {
      await context.close()
    }
  }
})

test('phone autofill keeps the country code and all eleven German digits', async ({ page, context }) => {
  await usePreferences(context, 'light')
  await gotoHydrated(page, '/login')
  await page.locator('.phone-input').fill('+4915123456789')
  await expect(page.locator('.dial-code')).toContainText('+49')
  await expect(page.locator('.phone-input')).toHaveValue('(151) 234 56789')
  await expect(page.getByRole('button', { name: 'Получить код' })).toBeEnabled()
})

test('the privacy policy is a page of its own, also from old #privacy links', async ({ page, context }) => {
  await usePreferences(context, 'light')
  await gotoHydrated(page, '/login#privacy')
  await page.waitForURL('**/privacy')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect.poll(() => noHorizontalScroll(page)).toBe(true)
})

test('protected pages redirect to login', async ({ page }) => {
  await page.goto('/dashboard')
  await page.waitForURL('**/login')
})

test('signed-in pages render only in the browser and stay out of search', async ({ request }) => {
  // The session is restored in the browser, so a server render shows an anonymous account and the page
  // then fails hydration: every signed-in page is `ssr: false` with a noindex header (nuxt.config.ts).
  for (const path of ['/dashboard', '/new', '/notifications', '/account', '/chat/1011']) {
    const response = await request.get(path)
    expect(response.status(), path).toBe(200)
    expect(response.headers()['x-robots-tag'], path).toBe('noindex, nofollow')
    expect(await response.text(), path).toContain('<div id="__nuxt"></div>')
  }
})

test('a shared link that fails to load offers a retry, and only a missing link is gone', async ({ page, context }) => {
  await usePreferences(context, 'light')
  // The link may still work after a dropped connection, a server error or a burst of requests.
  let answer: 'abort' | number = 500
  await page.route('**/api/v1/public/**', (route) =>
    answer === 'abort'
      ? route.abort('internetdisconnected')
      : route.fulfill({ status: answer, json: { code: 'TEST', message: 'test' } }),
  )
  for (const failure of ['abort', 500, 429] as const) {
    answer = failure
    await gotoHydrated(page, '/s/retry-test-token')
    await expect(page.getByRole('heading', { name: 'Не получилось открыть ссылку' }), String(failure)).toBeVisible()
  }
  // «Повторить» asks again; a 404 means the link is off, deleted or expired.
  answer = 404
  await page.getByRole('button', { name: 'Повторить' }).click()
  await expect(page.getByRole('heading', { name: 'Ссылка больше не работает' })).toBeVisible()
})

test('the example report opens without signing in', async ({ page, context }, testInfo) => {
  await usePreferences(context, 'light')
  await gotoHydrated(page, '/example')
  // The name is the poster's h1; the public header is the logo and one «Войти», with no back circle.
  await expect(page.getByRole('heading', { name: 'Аня', level: 1 })).toBeVisible()
  await expect(page.locator('.site-header').getByRole('link', { name: 'Войти' })).toBeVisible()
  await expect(page.locator('.site-header').getByRole('link', { name: 'Назад' })).toHaveCount(0)
  // The example is the same report as an owner's: three parts, «Вы двое», «Время» and «О чём».
  for (const id of ['together', 'time', 'words']) await expect(page.locator(`#chapter-${id}`)).toBeVisible()
  await expect(page.locator('.report-section')).not.toHaveCount(0)
  await expect.poll(() => noHorizontalScroll(page)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('example-header.png'), animations: 'disabled' })
})

test('report navigation survives resizing between phone, tablet and desktop', async ({ page, context }) => {
  await usePreferences(context, 'dark')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await gotoHydrated(page, '/example')
  for (const width of [320, 390, 650, 768, 1024, 1440, 430]) {
    await page.setViewportSize({ width, height: width === 430 ? 932 : 844 })
    await expect.poll(() => noHorizontalScroll(page)).toBe(true)
    // Wide screens keep the name quiet, so there is no line to fit.
    if (width < 901 && (await page.locator('.page-bar__lede').count()))
      await expect
        .poll(() => page.locator('.page-bar__lede').evaluate((element) => element.scrollWidth <= element.clientWidth))
        .toBe(true)
    await openCard(page, 'time')
    await expect(page.locator('#part-time')).toBeInViewport()
    await openCard(page, 'balance')
    await expect(page.locator('#part-balance')).toBeInViewport()
  }
})

test('client-rendered pages give feedback before the app JavaScript loads', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 800 }, colorScheme: 'dark' })
  try {
    await usePreferences(context, 'light')
    await context.route('**/_nuxt/*.js', (route) => route.abort())
    const page = await context.newPage()
    for (const path of ['/example', '/dashboard']) {
      await page.goto(new URL(path, baseURL).toString())
      await expect(page.getByRole('progressbar', { name: 'TGDuet', exact: true })).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
      expect(await noHorizontalScroll(page)).toBe(true)
    }
  } finally {
    await context.close()
  }
})

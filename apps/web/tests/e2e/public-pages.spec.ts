import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { gotoHydrated, noHorizontalScroll, openCard, usePreferences } from './helpers'

test('system dark theme hydrates without replacing the theme icon', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (/hydration.*mismatch/i.test(message.text())) errors.push(message.text())
  })
  await page.emulateMedia({ colorScheme: 'dark' })
  await gotoHydrated(page, '/login')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('button', { name: 'Светлая тема', exact: true })).toBeVisible()
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

test('locale switch changes the interface language', async ({ page, context }) => {
  await usePreferences(context, 'light', 'ru')
  await gotoHydrated(page, '/login')
  await expect(page.getByRole('button', { name: 'Получить код' })).toBeVisible()
  await page.locator('.locale-switch button').click()
  await expect(page.getByRole('button', { name: 'Get code' })).toBeVisible()
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

test('the example report opens without signing in', async ({ page }, testInfo) => {
  await gotoHydrated(page, '/example')
  // The name is the h1 of the bar; over the poster the bar shows it only as the poster's big name.
  await expect(page.getByRole('heading', { name: 'Аня', level: 1 })).toBeAttached()
  await expect(page.locator('#header-page').getByRole('link', { name: 'Войти' })).toBeVisible()
  if (page.viewportSize()!.width <= 640 && (await page.locator('.page-bar__lede').count())) {
    await expect
      .poll(() => page.locator('.page-bar__lede').evaluate((element) => element.scrollWidth <= element.clientWidth))
      .toBe(true)
  }
  // The example is the same report as an owner's: balance first, then habits, time, words, emoji.
  for (const id of ['balance', 'habits', 'time', 'words', 'favourites'])
    await expect(page.locator(`#part-${id}`)).toBeVisible()
  await expect(page.locator('.report-section')).toHaveCount(5)
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
      await expect(page.getByRole('progressbar', { name: 'TG Analyzer', exact: true })).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
      expect(await noHorizontalScroll(page)).toBe(true)
    }
  } finally {
    await context.close()
  }
})

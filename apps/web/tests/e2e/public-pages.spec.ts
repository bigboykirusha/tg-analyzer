import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { gotoHydrated, noHorizontalScroll, usePreferences } from './helpers'

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
for (const path of ['/', '/login', '/faq', '/terms', '/example'])
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

test('the privacy policy opens full screen over the login page', async ({ page, context }) => {
  await usePreferences(context, 'light')
  // The login card has no privacy line any more: the policy opens from the #privacy link.
  await gotoHydrated(page, '/login#privacy')
  const policy = page.getByRole('dialog', { name: 'Политика конфиденциальности' })
  await expect(policy).toBeVisible()
  await expect(policy.getByText('Коротко')).toHaveCount(0)
  await policy.getByRole('button', { name: 'Закрыть' }).click()
  await expect(policy).toBeHidden()

  // Old /privacy links land on «Privacy and questions».
  await page.goto('/privacy')
  await page.waitForURL('**/faq')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

for (const path of ['/terms']) {
  test(`${path} is reachable without signing in`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
}

test('protected pages redirect to login', async ({ page }) => {
  await page.goto('/dashboard')
  await page.waitForURL('**/login')
})

test('the example report opens without signing in', async ({ page }, testInfo) => {
  await gotoHydrated(page, '/example')
  await expect(page.getByRole('heading', { name: 'Аня', level: 1 })).toBeVisible()
  await expect(page.locator('#header-page').getByRole('link', { name: 'Войти' })).toBeVisible()
  if (page.viewportSize()!.width <= 640) {
    await expect
      .poll(() => page.locator('.page-bar__lede').evaluate((element) => element.scrollWidth <= element.clientWidth))
      .toBe(true)
  }
  await expect(page.getByRole('heading', { name: 'Вы двое', exact: true })).toBeVisible()
  // The example has voice messages without duration metadata. Their count
  // must remain visible rather than being described as absent.
  const voice = page.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Голосовые', exact: true }) })
  await expect(voice).toBeVisible()
  await expect(voice.locator('dd')).toHaveCount(2)
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
    if (width < 901)
      await expect
        .poll(() => page.locator('.page-bar__lede').evaluate((element) => element.scrollWidth <= element.clientWidth))
        .toBe(true)
    await page.getByRole('tab', { name: 'Время', exact: true }).click()
    await expect(page.locator('#part-time')).toBeInViewport()
    await page.getByRole('tab', { name: 'Вы двое', exact: true }).click()
    await expect(page.locator('#part-together')).toBeInViewport()
  }
})

test('the activity calendar names each day in its tooltip and scrolls without a page overflow', async ({
  page,
  context,
}, testInfo) => {
  await usePreferences(context, 'dark')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await gotoHydrated(page, '/example')
  const calendar = page.locator('.heatmap')
  const cells = calendar.locator('.heatmap__grid [data-date]')
  const count = await cells.count()
  expect(count).toBeGreaterThan(7)
  expect(await cells.nth(count - 2).getAttribute('title')).toBeTruthy()
  await expect(calendar.locator('.heatmap__selection')).toHaveCount(0)
  await page
    .getByRole('article')
    .filter({ has: calendar })
    .screenshot({
      path: testInfo.outputPath('calendar.png'),
      animations: 'disabled',
    })

  const scroller = calendar.getByRole('region', { name: 'Активность по дням', exact: true })
  const earlier = calendar.getByRole('button', { name: 'Более ранние недели', exact: true })
  if (await earlier.isVisible()) {
    const before = await scroller.evaluate((element) => element.scrollLeft)
    await earlier.click()
    await expect.poll(() => scroller.evaluate((element) => element.scrollLeft)).toBeLessThan(before)
  }
  await expect.poll(() => noHorizontalScroll(page)).toBe(true)
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

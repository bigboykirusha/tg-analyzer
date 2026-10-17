import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { gotoHydrated, noHorizontalScroll, usePreferences } from './helpers'

for (const theme of ['light', 'dark'] as const) {
  test(`login renders without accessibility violations in ${theme}`, async ({ page, context }) => {
    await usePreferences(context, theme)
    await page.goto('/login')
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect.poll(() => noHorizontalScroll(page)).toBe(true)

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(results.violations.map((violation) => violation.id)).toEqual([])
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

for (const path of ['/privacy', '/terms']) {
  test(`${path} is reachable without signing in`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })
}

test('protected pages redirect to login', async ({ page }) => {
  await page.goto('/dashboard')
  await page.waitForURL('**/login')
})

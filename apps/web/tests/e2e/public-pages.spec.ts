import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const viewports = [
  { name: '390', width: 390, height: 844 },
  { name: '1280', width: 1280, height: 900 },
]
const themes = ['light', 'dark'] as const

test.skip(({ isMobile }) => Boolean(isMobile), 'This suite controls its responsive viewports explicitly')

for (const viewport of viewports) {
  for (const theme of themes) {
    test(`login is responsive and accessible at ${viewport.name} in ${theme}`, async ({ page }) => {
      await page.addInitScript(
        ({ selectedTheme }) => {
          localStorage.setItem('tg-analyzer-theme', selectedTheme)
          localStorage.setItem('tg-analyzer-locale', 'ru')
        },
        { selectedTheme: theme },
      )
      await page.setViewportSize(viewport)
      await page.goto('/login')
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      await expect(page.locator(theme === 'dark' ? '.theme-icon-sun' : '.theme-icon-moon')).toHaveClass(/active/)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

      const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
      expect(results.violations).toEqual([])

      await expect(page).toHaveScreenshot(`login-${viewport.name}-${theme}.png`, {
        fullPage: true,
        animations: 'disabled',
        timeout: 15_000,
      })
    })
  }
}

test('country selector is usable as a mobile sheet', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('tg-analyzer-theme', 'dark')
    localStorage.setItem('tg-analyzer-locale', 'ru')
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 15_000 })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.waitForFunction(() => {
    const root = document.querySelector('#__nuxt') as (HTMLElement & { __vue_app__?: unknown }) | null
    return Boolean(root?.__vue_app__)
  })
  await page.getByRole('button', { name: 'Страна', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Выберите страну' })).toBeVisible()

  const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze()
  expect(results.violations).toEqual([])
  await expect(page).toHaveScreenshot('login-country-selector-390-dark.png', {
    fullPage: true,
    animations: 'disabled',
    timeout: 15_000,
  })
  await page.getByRole('option', { name: /GE.*\+995/ }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.locator('.dial-code')).toContainText('+995')
  await page.locator('.phone-input').fill('555123456')
  await expect(page.getByRole('button', { name: 'Получить код', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Страна', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Страна', exact: true })).toBeFocused()
})

test('login keeps balanced columns through the tablet-to-desktop breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 820 })
  await page.goto('/login')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  const layout = await page.evaluate(() => {
    const story = document.querySelector<HTMLElement>('.login-story')?.getBoundingClientRect()
    const panel = document.querySelector<HTMLElement>('.login-panel')?.getBoundingClientRect()
    return story && panel
      ? {
          storyWidth: story.width,
          panelWidth: panel.width,
          columnsOverlap: story.right > panel.left,
        }
      : null
  })

  expect(layout).not.toBeNull()
  expect(layout?.storyWidth).toBeGreaterThan(480)
  expect(layout?.panelWidth).toBeGreaterThanOrEqual(520)
  expect(layout?.columnsOverlap).toBe(false)
})

test('offline and not-found states remain readable', async ({ page }) => {
  await page.goto('/offline', { waitUntil: 'domcontentloaded', timeout: 15_000 })
  await expect(page.getByRole('heading')).toBeVisible()
  await expect(page).toHaveScreenshot('offline.png', {
    fullPage: true,
    animations: 'disabled',
    timeout: 15_000,
  })

  await page.goto('/does-not-exist', { waitUntil: 'domcontentloaded', timeout: 15_000 })
  await expect(page.getByRole('heading')).toBeVisible()
  await expect(page).toHaveScreenshot('not-found.png', {
    fullPage: true,
    animations: 'disabled',
    timeout: 15_000,
  })
})

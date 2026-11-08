import { expect, type BrowserContext, type Page } from '@playwright/test'

export async function usePreferences(context: BrowserContext, theme: 'light' | 'dark', locale: 'ru' | 'en' = 'ru') {
  const url = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000'
  await context.addCookies([
    { name: 'tg-analyzer-theme', value: theme, url },
    { name: 'tg-analyzer-locale', value: locale, url },
  ])
}

/** Waits until Nuxt has hydrated, so that clicks reach Vue handlers. */
export async function gotoHydrated(page: Page, path: string) {
  await page.goto(path)
  await page.waitForFunction(() =>
    Boolean((document.querySelector('#__nuxt') as { __vue_app__?: unknown } | null)?.__vue_app__),
  )
  await page.waitForLoadState('networkidle')
}

export async function noHorizontalScroll(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
}

/** Signs in through the fake Telegram gateway (TELEGRAM_MODE=fake, code 12345). */
export async function signIn(page: Page, options: { navigate?: boolean } = {}) {
  // A fresh number per test keeps analysis cooldowns from leaking between runs.
  const phone = `900${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`.replace(/9$/, '1')
  if (options.navigate !== false) await gotoHydrated(page, '/login')
  await page.locator('.phone-input').fill(phone)
  await page.getByRole('button', { name: 'Получить код' }).click()
  await page.locator('.otp-input').first().click()
  await page.keyboard.type('12345')
  await page.getByRole('button', { name: 'Подтвердить код' }).click()
  await page.waitForURL('**/dashboard')
}

export async function backendAvailable(baseURL: string) {
  try {
    const response = await fetch(new URL('/api/v1/auth/refresh', baseURL), { method: 'POST' })
    return response.status === 401
  } catch {
    return false
  }
}

/**
 * Opens a chapter of a report. Phones and tablets have no chapter tabs: the capsule in the header opens
 * a sheet of chapters (it shows up once the poster's name has gone under the bar). Wide screens keep tabs.
 */
export async function openChapter(page: Page, name: string) {
  if (page.viewportSize()!.width > 900) {
    await page.getByRole('tab', { name }).click()
    return
  }
  const capsule = page.locator('.capsule')
  await capsule.waitFor({ state: 'attached' })
  // The capsule rises once the name on the poster has gone under the bar.
  await expect
    .poll(async () => {
      await page.evaluate(() => {
        if (window.scrollY < 80) window.scrollTo({ top: 120, behavior: 'instant' })
      })
      return capsule.isVisible()
    })
    .toBe(true)
  // A pinned bar: Playwright's scroll-into-view would take the page back to the top, where the capsule hides.
  await capsule.evaluate((element: HTMLElement) => element.click())
  await page
    .locator('.chapters__row')
    .filter({ has: page.getByText(name, { exact: true }) })
    .click()
}

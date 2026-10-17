import type { BrowserContext, Page } from '@playwright/test'

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
export async function signIn(page: Page) {
  // A fresh number per test keeps analysis cooldowns from leaking between runs.
  const phone = `900${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`.replace(/9$/, '1')
  await gotoHydrated(page, '/login')
  await page.locator('.phone-input').fill(phone)
  await page.getByRole('button', { name: 'Получить код' }).click()
  await page.locator('.otp-input').first().click()
  await page.keyboard.type('12345')
  await page.getByRole('button', { name: 'Подтвердить код' }).click()
  // Signing in lands on «Мои люди»; flows below start from the chats list.
  await page.waitForURL('**/people')
  await gotoHydrated(page, '/dashboard')
}

export async function backendAvailable(baseURL: string) {
  try {
    const response = await fetch(new URL('/api/v1/auth/refresh', baseURL), { method: 'POST' })
    return response.status === 401
  } catch {
    return false
  }
}

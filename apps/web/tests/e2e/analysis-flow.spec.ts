import { expect, test } from '@playwright/test'
import { backendAvailable, noHorizontalScroll, signIn, usePreferences } from './helpers'

// Needs the API and worker running with TELEGRAM_MODE=fake. All sign-ins come
// from one IP, so run the API with a higher AUTH_RATE_LIMIT_MAX (CI uses 100).
test.beforeEach(async ({ baseURL, context }) => {
  test.skip(!(await backendAvailable(baseURL!)), 'API is not running in fake Telegram mode')
  await usePreferences(context, 'light')
})

test('sign in, analyse a private chat and read the report', async ({ page }) => {
  await signIn(page)
  const row = page.locator('.chat-row').filter({ hasText: 'Катя' })
  await row.getByRole('button', { name: 'Анализ' }).click()
  await expect(page.getByText('Отчёт готов')).toBeVisible({ timeout: 30_000 })

  await row.getByRole('link', { name: 'Открыть отчёт' }).click()
  await page.waitForURL('**/chat/1006')
  await expect(page.getByRole('heading', { name: 'Катя' })).toBeVisible()

  for (const tab of ['Когда', 'О чём', 'Динамика', 'Кто кому']) {
    await page.getByRole('tab', { name: tab }).click()
    await expect(page.locator('.report-section').first()).toBeVisible()
  }
  await expect.poll(() => noHorizontalScroll(page)).toBe(true)

  await page.goto('/dashboard')
  await expect(
    page.locator('.chat-row').filter({ hasText: 'Катя' }).getByRole('link', { name: 'Открыть отчёт' }),
  ).toBeVisible()
})

test('group chats get the group report', async ({ page }) => {
  await signIn(page)
  const row = page.locator('.chat-row').filter({ hasText: 'Weekend plans' })
  await row.getByRole('button', { name: 'Анализ' }).click()
  await expect(page.getByText('Отчёт готов')).toBeVisible({ timeout: 60_000 })

  await page.goto('/chat/-1002004')
  for (const tab of ['Участники', 'Динамика', 'Взаимодействия', 'Контент']) {
    await page.getByRole('tab', { name: tab }).click()
    await expect(page.locator('.report-section').first()).toBeVisible()
  }
})

test('logging out returns to the login page', async ({ page }) => {
  await signIn(page)
  await page.locator('.account-trigger').click()
  await page.getByRole('menuitem', { name: 'Выйти' }).click()
  await page.waitForURL('**/login')
})

test('people shows who you talk to most, from recent chats', async ({ page }) => {
  await signIn(page)
  await page.goto('/people')
  await expect(page.getByRole('heading', { name: 'Мои люди' })).toBeVisible()
  // The overview is built in the background; the page polls until it is ready.
  await expect(page.getByRole('heading', { name: 'Ближе всего сейчас' })).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('.person').first()).toBeVisible()
  await expect.poll(() => noHorizontalScroll(page)).toBe(true)
})

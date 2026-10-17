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

  for (const tab of ['Активность', 'О чём', 'Динамика', 'Баланс']) {
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

test('the recap opens as stories with both names and saves a slide', async ({ page }) => {
  await signIn(page)
  const row = page.locator('.chat-row').filter({ hasText: 'Катя' })
  await row.getByRole('button', { name: 'Анализ' }).click()
  await expect(page.getByText('Отчёт готов')).toBeVisible({ timeout: 30_000 })
  await page.goto('/chat/1006')
  await expect(page.getByRole('heading', { name: 'Катя' })).toBeVisible({ timeout: 15_000 })

  const recap = page.getByRole('button', { name: 'Итоги' })
  if (await recap.isVisible()) await recap.click()
  else {
    await page.getByRole('button', { name: 'Действия с отчётом' }).last().click()
    await page.getByRole('menuitem', { name: 'Итоги' }).click()
  }

  const stories = page.getByRole('dialog', { name: 'Итоги переписки' })
  await expect(stories.locator('.stories__segment')).toHaveCount(3)
  await expect(stories.locator('.stories__stage .story-slide__names')).toHaveText(/Demo\s*&\s*Катя/)

  await stories.getByRole('button', { name: 'Поделиться' }).click()
  for (const option of ['Сторис в Instagram', 'Сторис в Telegram', 'Отправить в чат']) {
    await expect(stories.getByRole('menuitem', { name: new RegExp(option) })).toBeVisible()
  }
  await stories.getByRole('button', { name: 'Отмена' }).click()

  const download = page.waitForEvent('download')
  await stories.getByRole('button', { name: 'Сохранить' }).click()
  expect((await download).suggestedFilename()).toBe('tg-analyzer-overview.png')
})

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

  // With a first report the home page turns into the summary; the chat list lives on /new.
  await expect(page.getByRole('heading', { name: 'Ваш круг' })).toBeVisible()
  await page.goto('/new')
  await page.locator('.chat-row').filter({ hasText: 'Катя' }).getByRole('link', { name: 'Открыть отчёт' }).click()
  await page.waitForURL('**/chat/1006')
  await expect(page.getByRole('heading', { name: 'Катя' })).toBeVisible()

  for (const tab of ['Активность', 'О чём', 'Динамика', 'Баланс']) {
    await page.getByRole('tab', { name: tab }).click()
    await expect(page.locator('.report-section').first()).toBeVisible()
  }
  await expect.poll(() => noHorizontalScroll(page)).toBe(true)

  await page.goto('/new')
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

test('account settings disconnect Telegram but keep the account', async ({ page }) => {
  await signIn(page)
  await page.locator('.account-trigger').click()
  await page.getByRole('menuitem', { name: 'Аккаунт и приватность' }).click()
  await page.waitForURL('**/account')

  const autoDisconnect = page.getByRole('switch', { name: /Отключаться после каждого анализа/ })
  await autoDisconnect.check({ force: true })
  await expect(autoDisconnect).toBeChecked()

  await page.getByRole('button', { name: 'Отключить Telegram' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Отключить Telegram' }).click()
  await expect(page.getByText('Не подключён')).toBeVisible()
  expect(await noHorizontalScroll(page)).toBe(true)
})

test('the recap opens as stories with both names and saves a slide', async ({ page }) => {
  await signIn(page)
  const row = page.locator('.chat-row').filter({ hasText: 'Катя' })
  await row.getByRole('button', { name: 'Анализ' }).click()
  await expect(page.getByText('Отчёт готов')).toBeVisible({ timeout: 30_000 })
  await page.goto('/chat/1006')
  await expect(page.getByRole('heading', { name: 'Катя' })).toBeVisible({ timeout: 15_000 })

  await page.getByRole('button', { name: 'Итоги' }).click()

  const stories = page.getByRole('dialog', { name: 'Итоги переписки' })
  // Up to four dense slides: the overview with the total first, then what the data allows.
  await expect.poll(() => stories.locator('.stories__segment').count()).toBeGreaterThanOrEqual(2)
  await expect(stories.locator('.stories__stage .story-slide__heading strong')).toHaveText(/Demo\s*&\s*Катя/)
  await expect(stories.locator('.stories__stage .story-slide__title')).toHaveText(/^\d[\d\s]*$/)
  await page.keyboard.press('ArrowRight')
  await expect(stories.locator('.stories__stage .story-slide__heading strong')).toHaveText(/Demo\s*&\s*Катя/)

  await stories.getByRole('button', { name: 'Поделиться' }).click()
  for (const option of ['Сторис в Instagram', 'Сторис в Telegram', 'Отправить в чат']) {
    await expect(stories.getByRole('menuitem', { name: new RegExp(option) })).toBeVisible()
  }
  await stories.getByRole('button', { name: 'Отмена' }).click()

  const download = page.waitForEvent('download')
  await stories.getByRole('button', { name: 'Сохранить' }).click()
  expect((await download).suggestedFilename()).toMatch(/^tg-analyzer-[a-z]+\.png$/)
})

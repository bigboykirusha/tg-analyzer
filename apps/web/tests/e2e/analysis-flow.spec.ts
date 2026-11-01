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

  // The very first report opens by itself.
  await page.waitForURL('**/chat/1006')
  await page.goto('/dashboard')
  // With a first report the home page turns into the summary; the chat list lives on /new.
  await expect(page.getByRole('heading', { name: 'Ваш круг' })).toBeVisible()
  await page.goto('/new')
  await page.locator('.chat-row').filter({ hasText: 'Катя' }).getByRole('link', { name: 'Открыть отчёт' }).click()
  await page.waitForURL('**/chat/1006')
  await expect(page.getByRole('heading', { name: 'Катя' })).toBeVisible()

  // One long page: the nav jumps to each part and marks it.
  for (const [tab, part] of [
    ['Время', 'time'],
    ['О чём', 'words'],
    ['Вы двое', 'together'],
  ]) {
    await page.getByRole('tab', { name: tab }).click()
    await expect(page.locator(`#part-${part}`)).toBeInViewport()
    await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true')
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
  for (const [tab, part] of [
    ['Общение', 'talk'],
    ['Время', 'time'],
    ['Люди', 'people'],
  ]) {
    await page.getByRole('tab', { name: tab }).click()
    await expect(page.locator(`#part-${part}`)).toBeInViewport()
  }
})

test('signing out from the account page returns to the login page', async ({ page }) => {
  await signIn(page)
  await page.goto('/account')
  await expect(page.getByRole('heading', { name: 'Аккаунт' })).toBeVisible()
  // Telegram settings are gone: the page keeps appearance, data and «Выйти».
  await expect(page.getByText('Отключаться после каждого анализа')).toHaveCount(0)
  expect(await noHorizontalScroll(page)).toBe(true)

  await page.getByRole('button', { name: 'Выйти', exact: true }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog.getByRole('button', { name: 'Выйти и удалить отчёты' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Выйти', exact: true }).click()
  await page.waitForURL('**/login')
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

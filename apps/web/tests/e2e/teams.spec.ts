import { expect, test } from '@playwright/test'
import { backendAvailable, gotoHydrated, noHorizontalScroll, signIn, submitLogin, usePreferences } from './helpers'

test.beforeEach(async ({ baseURL, context }) => {
  test.skip(!(await backendAvailable(baseURL!)), 'API is not running in fake Telegram mode')
  await usePreferences(context, 'light')
})

test('a colleague joins by link and reads the report the owner opened to the team', async ({ page, browser }) => {
  test.setTimeout(120_000)
  await signIn(page)
  await page.locator('.chat-row').filter({ hasText: 'Катя' }).getByRole('button', { name: 'Анализ' }).click()
  await expect(page.getByText('Отчёт готов')).toBeVisible({ timeout: 30_000 })

  // Create the team and an invitation link.
  await gotoHydrated(page, '/teams')
  await page.getByPlaceholder('Например, Отдел продаж').fill('Отдел продаж')
  await page.getByRole('button', { name: 'Создать команду' }).click()
  await page.waitForURL(/\/teams\/[\w-]+$/)
  await expect(page.getByRole('heading', { name: 'Отдел продаж' })).toBeVisible()
  await page.getByRole('tab', { name: 'Люди' }).click()
  await page.getByRole('button', { name: 'Создать ссылку' }).click()
  const link = (await page.locator('.invite__url').textContent())!.trim()
  expect(link).toContain('/invite/')
  await expect.poll(() => noHorizontalScroll(page)).toBe(true)

  // Open the report to the team from its «…» menu.
  await gotoHydrated(page, '/chat/1006')
  await page.getByRole('button', { name: 'Действия с отчётом' }).click()
  await page.getByRole('menuitem', { name: 'Открыть команде…' }).click()
  await page.getByRole('switch', { name: 'Отдел продаж' }).click()
  await expect(page.getByText('Открыт команде «Отдел продаж»')).toBeVisible()

  // The colleague follows the link, signs in on the way and joins.
  const context = await browser.newContext({ isMobile: test.info().project.name === 'mobile' })
  await usePreferences(context, 'light')
  const colleague = await context.newPage()
  await gotoHydrated(colleague, new URL(link).pathname)
  await colleague.waitForURL(/\/login\?next=/)
  await submitLogin(colleague)
  await colleague.waitForURL('**/invite/**')
  await expect(colleague.getByRole('heading', { name: 'Вход в «Отдел продаж»' })).toBeVisible()
  await colleague.getByRole('button', { name: 'Вступить в команду' }).click()
  await colleague.waitForURL(/\/teams\/[\w-]+$/)

  await colleague.locator('.report-card').filter({ hasText: 'Катя' }).click()
  await expect(colleague.getByRole('heading', { name: 'Катя' })).toBeVisible()
  await expect(colleague.getByRole('note')).toContainText('«Вы» в отчёте')
  await expect.poll(() => noHorizontalScroll(colleague)).toBe(true)
  await context.close()
})

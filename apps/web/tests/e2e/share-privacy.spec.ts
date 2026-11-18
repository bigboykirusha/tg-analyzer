import { expect, test } from '@playwright/test'
import type { PublicReportDto } from '@tg-analyzer/shared'
import { analyseChat, backendAvailable, gotoHydrated, signIn, usePreferences } from './helpers'

test('a public report link matches the share settings and waits for account changes', async ({
  page,
  context,
  baseURL,
}) => {
  test.setTimeout(90_000)
  test.skip(!(await backendAvailable(baseURL!)), 'API is not running in fake Telegram mode')
  await usePreferences(context, 'light')
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined })
  })

  await signIn(page)
  await analyseChat(page, 'Катя')
  await page.waitForURL('**/chat/1006', { timeout: 30_000 })
  await page.getByRole('button', { name: 'Поделиться', exact: true }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: /Ссылка на отчёт/ }).click()

  const names = dialog.getByRole('switch', { name: /^Показывать имена/ })
  const words = dialog.getByRole('switch', { name: /^Показывать слова и эмодзи/ })
  const copy = dialog.getByRole('button', { name: 'Скопировать ссылку' })
  const linksPath = '**/api/v1/reports/1006/links'
  await words.check()

  const creation = Promise.withResolvers<void>()
  await page.route(
    linksPath,
    async (route) => {
      await creation.promise
      await route.continue()
    },
    { times: 1 },
  )
  const firstResponse = page.waitForResponse(linksPath)
  try {
    await copy.click()
    await expect(names).toBeDisabled()
    await expect(words).toBeDisabled()
  } finally {
    creation.resolve()
  }
  const visibleLink = await (await firstResponse).json()
  expect(visibleLink.settings).toEqual({ showName: true, words: true, stickers: true })
  const manualAddress = dialog.getByText(`${baseURL}/s/${visibleLink.token}`, { exact: true })
  await expect(manualAddress).toBeVisible()
  const title = dialog.locator('.link-step__title')
  const caption = dialog.getByText(/^Автор отчёта — /)
  const publishedCover = await dialog.locator('.link-step__poster').innerText()
  const guest = await context.newPage()
  await gotoHydrated(guest, `/s/${visibleLink.token}`)
  await expect(guest.getByRole('heading', { name: await title.innerText(), exact: true })).toBeVisible()
  await expect(guest.getByText(await caption.innerText(), { exact: true })).toBeVisible()
  await guest.close()

  await names.uncheck()
  await expect(manualAddress).toBeHidden()
  await expect(title).toHaveText('Личная переписка')
  await expect(caption).toHaveCount(0)
  await expect(dialog.getByText('При копировании появится новая ссылка. Прежняя перестанет работать.')).toBeVisible()
  expect((await page.request.get(`/api/v1/public/${visibleLink.token}`)).status()).toBe(200)

  // The owner has refreshed the report, but the link still points at the published snapshot.
  await page.route(
    '**/api/v1/reports/1006',
    async (route) => {
      const response = await route.fetch()
      const current = await response.json()
      current.summary.title = 'Катя после обновления'
      current.report.totals.messages = 240
      await route.fulfill({ response, json: current })
    },
    { times: 1 },
  )
  await gotoHydrated(page, '/chat/1006')
  await expect(page.getByRole('heading', { name: 'Катя после обновления', exact: true })).toBeAttached()
  await page.getByRole('button', { name: 'Поделиться', exact: true }).first().click()
  await dialog.getByRole('button', { name: /Ссылка на отчёт/ }).click()
  await expect(dialog.locator('.link-step__poster')).toHaveText(publishedCover, { useInnerText: true })

  await names.uncheck()
  await expect(dialog.locator('.link-step__poster')).toContainText('240 сообщений')
  await words.uncheck()
  const secondResponse = page.waitForResponse(linksPath)
  await copy.click()
  const privateLink = await (await secondResponse).json()
  expect(privateLink.settings).toEqual({ showName: false, words: false, stickers: false })
  expect((await page.request.get(`/api/v1/public/${visibleLink.token}`)).status()).toBe(404)
  await expect(dialog.getByText(`${baseURL}/s/${privateLink.token}`, { exact: true })).toBeVisible()

  await gotoHydrated(page, `/s/${privateLink.token}`)
  await expect(page.getByRole('heading', { name: 'Личная переписка' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Сообщения по дням. Сверху Автор, снизу Собеседник' })).toBeVisible()
  const sides = page.locator('.balance__sides')
  await expect(sides.getByText('Автор', { exact: true })).toBeVisible()
  await expect(sides.getByText('Собеседник', { exact: true })).toBeVisible()

  await page.route(`**/api/v1/public/${privateLink.token}`, async (route) => {
    const response = await route.fetch()
    const share: PublicReportDto = await response.json()
    share.data.report.totals.sent = share.data.report.totals.messages
    share.data.report.totals.received = 0
    await route.fulfill({ response, json: share })
  })
  await gotoHydrated(page, `/s/${privateLink.token}`)
  await expect(page.locator('#part-balance')).toContainText('Все сообщения от автора')

  await gotoHydrated(page, '/account')
  const link = page.getByRole('switch', { name: /^Отчёт «Катя»/ })
  await expect(link).toBeChecked()
  const updatePath = '**/api/v1/reports/1006/links/report'
  const update = Promise.withResolvers<void>()
  await page.route(
    updatePath,
    async (route) => {
      await update.promise
      await route.abort()
    },
    { times: 1 },
  )
  try {
    await link.click()
    await expect(link).toBeDisabled()
  } finally {
    update.resolve()
  }
  await expect(page.getByText('Не удалось изменить ссылку')).toBeVisible()
  await expect(link).toBeChecked()
  await expect(link).toBeEnabled()

  const updated = page.waitForResponse(updatePath)
  await link.click()
  expect((await updated).ok()).toBe(true)
  await expect(link).not.toBeChecked()
  await expect(link).toBeEnabled()
  expect((await page.request.get(`/api/v1/public/${privateLink.token}`)).status()).toBe(404)
})

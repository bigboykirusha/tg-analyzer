import { expect, test, type Page } from '@playwright/test'
import { analyseChat, backendAvailable, gotoHydrated, signIn, usePreferences } from './helpers'

test.describe.configure({ timeout: 90_000 })

test.beforeEach(async ({ baseURL, context }) => {
  test.skip(!(await backendAvailable(baseURL!)), 'API is not running in fake Telegram mode')
  await usePreferences(context, 'light')
})

async function openShare(page: Page) {
  await page.getByRole('button', { name: 'Поделиться', exact: true }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
}

/** Presses the button that makes the link and returns its token from the API's answer. */
async function makeLink(page: Page, button: string) {
  const made = page.waitForResponse((r) => /\/links$/.test(r.url()) && r.request().method() === 'POST')
  await page.getByRole('dialog').getByRole('button', { name: button }).first().click()
  return ((await (await made).json()) as { token: string }).token
}

test('the author guesses first, the guest answers and both scores come together', async ({ page, browser }) => {
  await signIn(page)
  await analyseChat(page, 'Мила')
  await page.waitForURL('**/chat/1011', { timeout: 30_000 })
  await openShare(page)
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: /Угадайка/ }).click()

  // Picks are optional: a row opens them, «Не ставить» gives them up, and a half-made set holds the link back.
  await dialog.getByRole('button', { name: /Поставить свои ответы/ }).click()
  const groups = dialog.getByRole('radiogroup')
  const count = await groups.count()
  expect(count).toBeGreaterThanOrEqual(3)
  await groups.first().getByRole('radio').first().click()
  await expect(dialog.getByText('Отметьте все вопросы или откажитесь от ставок')).toBeVisible()
  await expect(dialog.getByRole('button', { name: /Скопировать ссылку/ })).toBeDisabled()
  for (let index = 1; index < count; index += 1) await groups.nth(index).getByRole('radio').first().click()
  await expect(dialog.getByText('Из отчёта уходят только эти вопросы, счёт и ваши ставки.')).toBeVisible()
  const token = await makeLink(page, 'Скопировать ссылку')

  // The guest: no sign-in, the picks are not on the page before the answers.
  const guest = await browser.newContext({ locale: 'ru-RU' })
  await usePreferences(guest, 'light')
  const guestPage = await guest.newPage()
  await gotoHydrated(guestPage, `/s/${token}`)
  await guestPage.getByRole('button', { name: 'Начать' }).click()
  for (let step = 0; step < count; step += 1) {
    await guestPage.getByRole('radio').first().click()
    await guestPage.getByRole('button', { name: step + 1 < count ? 'Следующий вопрос' : 'Узнать счёт' }).click()
  }
  await expect(guestPage.getByText(/^Ваши ответы и ставки/)).toBeVisible()
  await expect(guestPage.getByText(/^Слева — вы, справа — /)).toBeVisible()
  await expect(guestPage.getByRole('term').first()).toBeVisible()
  await guest.close()

  // The author: both scores, and the legend of the two marks.
  await page.reload()
  await openShare(page)
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Угадайка/ })
    .click()
  await expect(page.getByRole('dialog').getByText('Слева — вы, справа — Мила')).toBeVisible()
  await expect(page.getByRole('dialog').getByText(/из \d/).first()).toBeVisible()
})

test('a quiz without picks is as it was: no versus on the guest screen', async ({ page, browser }) => {
  await signIn(page)
  await analyseChat(page, 'Мила')
  await page.waitForURL('**/chat/1011', { timeout: 30_000 })
  await openShare(page)
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: /Угадайка/ }).click()
  await expect(dialog.getByText('Из отчёта уходят только эти вопросы и счёт.')).toBeVisible()
  const token = await makeLink(page, 'Скопировать ссылку')

  const guest = await browser.newContext({ locale: 'ru-RU' })
  await usePreferences(guest, 'light')
  const guestPage = await guest.newPage()
  await gotoHydrated(guestPage, `/s/${token}`)
  await guestPage.getByRole('button', { name: 'Начать' }).click()
  for (let last = false; !last;) {
    await guestPage.getByRole('radio').first().click()
    const next = guestPage.getByRole('button', { name: /Следующий вопрос|Узнать счёт/ })
    last = ((await next.textContent()) ?? '').includes('Узнать')
    await next.click()
  }
  await expect(guestPage.getByText('Ваши ответы', { exact: true })).toBeVisible()
  await expect(guestPage.getByText(/^Слева — вы/)).toHaveCount(0)
  await guest.close()
})

test('a group report link names nobody by default and gives no ids', async ({ page, browser }) => {
  await signIn(page)
  await analyseChat(page, 'Продуктовая команда')
  await page.waitForURL('**/chat/-1002001', { timeout: 30_000 })
  await openShare(page)
  const dialog = page.getByRole('dialog')
  // The group has the link and no quiz.
  await expect(dialog.getByRole('button', { name: /Угадайка/ })).toHaveCount(0)
  await dialog.getByRole('button', { name: /Ссылка на отчёт/ }).click()
  const names = dialog.getByRole('switch', { name: /Показывать имена участников/ })
  await expect(names).not.toBeChecked()
  const token = await makeLink(page, 'Скопировать ссылку')

  const guest = await browser.newContext({ locale: 'ru-RU' })
  await usePreferences(guest, 'light')
  const guestPage = await guest.newPage()
  const opened = guestPage.waitForResponse((r) => r.url().endsWith(`/api/v1/public/${token}`))
  await gotoHydrated(guestPage, `/s/${token}`)
  const body = await (await opened).text()
  expect(body).not.toMatch(/"id":"(?!p\d+")/)
  await expect(guestPage.getByRole('heading', { name: 'Группа', exact: true })).toBeVisible()
  await expect(guestPage.getByText('Участник 1').first()).toBeVisible()
  await expect(guestPage.getByText('Отвечают друг другу чаще всех')).toHaveCount(0)
  await guest.close()
})

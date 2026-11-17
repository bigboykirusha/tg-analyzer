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

/** Answers every question with the first choice and returns how many there were. */
async function playThrough(page: Page) {
  let asked = 0
  for (let last = false; !last;) {
    await page.getByRole('radio').first().click()
    asked += 1
    const next = page.getByRole('button', { name: /Следующий вопрос|Узнать счёт/ })
    last = ((await next.textContent()) ?? '').includes('Узнать')
    await next.click()
  }
  return asked
}

test('the quiz is sent by link: the guest plays, the author sees the score', async ({ page, browser }) => {
  await signIn(page)
  await analyseChat(page, 'Мила')
  await page.waitForURL('**/chat/1011', { timeout: 30_000 })
  await openShare(page)
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: /Угадайка/ }).click()
  // Two ways and nothing else: send it, or play it yourself.
  await expect(dialog.getByText('Из отчёта уходят только эти вопросы и счёт.')).toBeVisible()
  await expect(dialog.getByRole('link', { name: /Пройти самостоятельно/ })).toBeVisible()
  await expect(dialog.getByRole('radiogroup')).toHaveCount(0)
  const token = await makeLink(page, 'Скопировать ссылку')

  const guest = await browser.newContext({ locale: 'ru-RU' })
  await usePreferences(guest, 'light')
  const guestPage = await guest.newPage()
  await gotoHydrated(guestPage, `/s/${token}`)
  await guestPage.getByRole('button', { name: 'Начать' }).click()
  // More than the old five: a close call is still a question.
  expect(await playThrough(guestPage)).toBeGreaterThan(5)
  await expect(guestPage.getByRole('list', { name: 'Ваши ответы' })).toBeVisible()
  await guest.close()

  await page.reload()
  await openShare(page)
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Угадайка/ })
    .click()
  await expect(page.getByRole('dialog').getByText(/^\d+ из \d+$/)).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Новая угадайка' })).toBeVisible()
})

test('the author plays the quiz alone: answers at once, nothing sent', async ({ page }) => {
  await signIn(page)
  await analyseChat(page, 'Мила')
  await page.waitForURL('**/chat/1011', { timeout: 30_000 })
  await openShare(page)
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: /Угадайка/ }).click()
  const posted = { links: 0 }
  page.on('request', (request) => {
    if (request.method() === 'POST' && /\/(links|answer)$/.test(request.url())) posted.links += 1
  })
  await dialog.getByRole('link', { name: /Пройти самостоятельно/ }).click()
  await page.waitForURL('**/quiz/1011')
  // Straight to the questions: «Я» first, then the other side.
  await expect(page.getByRole('radio').first()).toContainText('Я')
  await page.getByRole('radio').first().click()
  await expect(page.getByRole('status')).toHaveText(/^(Верно|Мимо) — это /)
  await page.getByRole('button', { name: 'Следующий вопрос' }).click()
  await playThrough(page)
  await expect(page.getByRole('list', { name: 'Ваши ответы' })).toBeVisible()
  expect(posted.links).toBe(0)
  await page.getByRole('link', { name: 'К отчёту' }).click()
  await page.waitForURL('**/chat/1011')
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

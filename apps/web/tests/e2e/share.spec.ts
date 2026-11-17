import type { PublicQuizDto } from '@tg-analyzer/shared'
import { expect, test, type Page } from '@playwright/test'
import { analyseChat, backendAvailable, gotoHydrated, noHorizontalScroll, signIn, usePreferences } from './helpers'

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

const answers = (page: Page) => page.getByRole('list', { name: 'Ответы на вопросы' })
const review = (page: Page) => page.getByText('Ответы на вопросы', { exact: true })

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
  await review(guestPage).click()
  await expect(answers(guestPage)).toBeVisible()
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

test('the guest can retry submitting the quiz without answering again', async ({ page, browser, baseURL }) => {
  await signIn(page)
  await analyseChat(page, 'Мила')
  await page.waitForURL('**/chat/1011', { timeout: 30_000 })
  await openShare(page)
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Угадайка/ })
    .click()
  const token = await makeLink(page, 'Скопировать ссылку')

  const guest = await browser.newContext({ locale: 'ru-RU' })
  await usePreferences(guest, 'light')
  const guestPage = await guest.newPage()
  const answerPath = `**/api/v1/public/${token}/answer`
  await guestPage.route(answerPath, (route) => route.abort(), { times: 1 })

  await gotoHydrated(guestPage, `${baseURL}/s/${token}`)
  await guestPage.getByRole('button', { name: 'Начать' }).click()
  await playThrough(guestPage)
  await expect(review(guestPage)).toHaveCount(0)
  await expect(guestPage.getByRole('alert')).toHaveText('Не удалось отправить результат.')
  await expect(guestPage.getByRole('radio').first()).toBeChecked()

  await guestPage.getByRole('button', { name: 'Повторить' }).click()
  await expect(guestPage.getByText('Результат сохранён', { exact: true })).toBeVisible()
  await review(guestPage).click()
  await expect(answers(guestPage)).toBeVisible()
  await guest.close()
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
  await review(page).click()
  await expect(answers(page)).toBeVisible()
  expect(posted.links).toBe(0)
  await page.getByRole('link', { name: 'К отчёту' }).click()
  await page.waitForURL('**/chat/1011')
})

test('the guest quiz keeps progress and the result reachable on a short phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  const token = 'long-author-quiz'
  const path = `**/api/v1/public/${token}`
  const author = 'Александр Константинопольский'
  const questions = [
    'starts',
    'talker',
    'laughs',
    'questions',
    'voice',
    'stickers',
    'doubleTexts',
    'reactions',
    'lastWord',
    'goodMorning',
  ] as const
  const quiz: PublicQuizDto = {
    kind: 'quiz',
    author,
    hue: 2,
    expiresAt: null,
    questions: questions.map((id, index) => ({
      id,
      unit: 'count',
      author: index % 2 === 0 ? 18 : 10,
      guest: index % 2 === 0 ? 10 : 18,
      answer: index % 2 === 0 ? 'author' : 'guest',
    })),
    answered: null,
  }
  await page.route(path, (route) => route.fulfill({ json: quiz }))
  await page.route(`${path}/answer`, (route) =>
    route.fulfill({
      json: {
        ...quiz,
        answered: {
          score: 5,
          total: questions.length,
          picks: questions.map(() => 'author'),
          answeredAt: new Date().toISOString(),
        },
      },
    }),
  )
  await gotoHydrated(page, `/s/${token}`)
  await page.getByRole('button', { name: 'Начать' }).click()
  await expect(page.locator('.site-header')).toHaveClass(/has-poster/)
  const progress = page.getByRole('progressbar', { name: 'Вопрос 1 из 10' })
  await expect(progress).toBeInViewport()
  const header = await page.locator('.site-header').boundingBox()
  expect((await progress.boundingBox())!.y).toBeGreaterThanOrEqual(header!.y + header!.height)

  expect(await playThrough(page)).toBe(10)
  await expect(page.getByRole('heading', { name: 'Ровно половина в точку', exact: true })).toBeInViewport()
  await expect(page.getByRole('link', { name: 'Разобрать свой чат', exact: true })).toBeInViewport()
  await expect(answers(page)).toBeHidden()
  await review(page).click()
  await expect(answers(page).getByRole('listitem')).toHaveCount(10)
  await expect(answers(page).getByText(author, { exact: true }).first()).toBeVisible()
  const question = answers(page).getByText('Кто чаще пишет первым?', { exact: true })
  expect((await question.boundingBox())!.width).toBeGreaterThan(100)
  await expect.poll(() => noHorizontalScroll(page)).toBe(true)
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
  await expect(guestPage.locator('#part-people .avatar--mine')).toHaveText('А')
  await expect(guestPage.getByText('Отвечают друг другу чаще всех')).toHaveCount(0)
  await expect(guestPage.locator('#chapter-words')).toHaveCount(0)
  await guest.close()
})

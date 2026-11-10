import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import {
  analyseChat,
  backendAvailable,
  gotoHydrated,
  noHorizontalScroll,
  openCard,
  signIn,
  usePreferences,
} from './helpers'

// A full flow includes login, background processing and image export.
test.describe.configure({ timeout: 60_000 })

// Needs the API and worker running with TELEGRAM_MODE=fake. All sign-ins come
// from one IP, so run the API with a higher AUTH_RATE_LIMIT_MAX (CI uses 100).
test.beforeEach(async ({ baseURL, context }) => {
  test.skip(!(await backendAvailable(baseURL!)), 'API is not running in fake Telegram mode')
  await usePreferences(context, 'light')
})

test('sign in, analyse a private chat and read the report', async ({ page }, testInfo) => {
  await signIn(page)
  await analyseChat(page, 'Катя')
  await expect(page.locator('.toast').getByText('Отчёт готов', { exact: true })).toBeVisible({ timeout: 30_000 })

  // The very first report opens by itself.
  await page.waitForURL('**/chat/1006')
  await page.goto('/dashboard')
  // With a first report the home page turns into the summary: the report is a card.
  const card = page.locator('.home-card').filter({ hasText: 'Катя' })
  await expect(card).toBeVisible()
  expect(await card.locator('.home-card__name').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true,
  )
  await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true, animations: 'disabled' })
  await card.getByRole('link', { name: 'Катя' }).click()
  await page.waitForURL('**/chat/1006')
  await expect(page.getByRole('heading', { name: 'Катя', exact: true })).toBeVisible()

  // One short page of cards: the balance is always there; a card the chat is too small for is not drawn.
  await expect(page.locator('.report-section')).not.toHaveCount(0)
  await openCard(page, 'balance')
  await expect(page.locator('#part-balance')).toBeInViewport()
  await expect(page.locator('.page-bar__lede')).toHaveCount(0)
  await expect.poll(() => noHorizontalScroll(page)).toBe(true)
  await page.goto('/new')
  await expect(page.locator('a.chat-row[href="/chat/1006"]')).toBeVisible()
})

test('the first report opens by itself when the analysis starts on the home page', async ({ page }) => {
  await signIn(page)
  // A newcomer: «С кого начнём?» offers the busiest chats, one main button; chats too small are not offered.
  await expect(page.getByRole('heading', { name: 'С кого начнём?' })).toBeVisible()
  await expect(page.locator('.home-card:not([aria-busy])').first()).toBeVisible()
  await expect(page.getByText('Курьер Игорь')).toHaveCount(0)
  await expect(page.getByText('Олег Смирнов')).toHaveCount(0)
  await page
    .locator('.home-card:not([aria-busy])')
    .first()
    .getByRole('button', { name: /^Разобрать чат/ })
    .click()
  await page.waitForURL('**/chat/**', { timeout: 30_000 })
})

test('a chat with too few messages has no «Разобрать» in the full list', async ({ page }) => {
  await signIn(page)
  // The home summary has to be counted before the list is asked for.
  await expect(page.locator('.home-card:not([aria-busy])').first()).toBeVisible()
  await gotoHydrated(page, '/new')
  const row = page.locator('.chat-row').filter({ hasText: 'Олег Смирнов' })
  await expect(row).toBeVisible()
  // Nothing is known about this chat yet: the button is there, the refusal teaches the list.
  await row.getByRole('button', { name: 'Разобрать чат «Олег Смирнов»' }).click()
  await expect(row.getByText('Мало сообщений')).toBeVisible()
  await expect(row.getByRole('button')).toHaveCount(0)
  // The home summary saw the courier’s size and flagged it without asking: no button from the start.
  await page.reload()
  const courier = page.locator('.chat-row').filter({ hasText: 'Курьер Игорь' })
  await expect(courier.getByText('Мало сообщений')).toBeVisible()
  await expect(courier.getByRole('button')).toHaveCount(0)
})

test('group chats get the group report', async ({ page }, testInfo) => {
  await signIn(page)
  await analyseChat(page, 'Weekend plans')
  await expect(page.locator('.toast').getByText('Отчёт готов', { exact: true })).toBeVisible({ timeout: 60_000 })

  await page.goto('/chat/-1002004')
  for (const part of ['people', 'roles', 'pairs', 'time', 'words']) {
    await openCard(page, part)
    await expect(page.locator(`#part-${part}`)).toBeInViewport()
  }
  const member = page.locator('#part-people button.list-row').first()
  const memberName = await member.locator('.list-row__title').innerText()
  await member.click()
  if (testInfo.project.name !== 'desktop') {
    const details = page.getByRole('dialog', { name: 'Участник', exact: true })
    await expect(details).toBeVisible()
    await expect(details.getByRole('heading', { name: memberName, exact: true })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('member-details.png'), animations: 'disabled' })
    await details.getByRole('button', { name: 'Закрыть', exact: true }).click()
    await expect(details).toBeHidden()
  } else {
    await expect(page.locator('.people__panel').getByRole('heading', { name: memberName, exact: true })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }
  // The pairs stay in the report, three rows at most.
  expect(await page.locator('#part-pairs .list-row').count()).toBeLessThanOrEqual(3)
})

test('a completed analysis is recovered when websocket progress is unavailable', async ({ page }) => {
  test.setTimeout(60_000)
  await page.routeWebSocket('**/ws/parse-progress**', (socket) => socket.close())
  await signIn(page)
  await analyseChat(page, 'Катя')
  await page.waitForURL('**/chat/1006', { timeout: 30_000 })
  await expect(page.getByRole('heading', { name: 'Катя', exact: true })).toBeVisible()
})

test('code autofill and two-step verification complete sign-in', async ({ page }) => {
  await gotoHydrated(page, '/login')
  const phone = `900${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}9`
  await page.locator('.phone-input').fill(phone)
  await page.getByRole('button', { name: 'Получить код' }).click()
  await page.locator('.otp-input').first().fill('12345')
  await page.locator('input[type="password"]').fill('secret')
  await page.getByRole('button', { name: 'Войти', exact: true }).click()
  await page.waitForURL('**/dashboard')
})

for (const delayMs of [0, 250]) {
  test(`retry after a network failure (${delayMs}ms) returns to the requested workspace page`, async ({ page }) => {
    await signIn(page)
    let offline = true
    await page.route('**/api/v1/auth/refresh', async (route) => {
      if (!offline) return route.continue()
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs))
      await route.abort()
    })
    await page.goto('/new')
    await page.waitForURL('**/offline?**')
    await expect(page.getByRole('button', { name: 'Попробовать снова' })).toBeVisible()
    // Keep interception installed while lazy page assets are loading. Changing
    // Chromium's interception mode mid-navigation can strand unrelated requests.
    offline = false
    await page.getByRole('button', { name: 'Попробовать снова' }).click()
    await page.waitForURL('**/new')
    await expect(page.getByRole('heading', { name: 'Новый анализ' })).toBeVisible()
  })
}

test('signing out from the account page returns to the login page', async ({ page }) => {
  await signIn(page)
  await page.goto('/account')
  await expect(page.getByRole('heading', { name: 'Аккаунт' })).toBeVisible()
  // Telegram settings are gone: the page keeps appearance, data and «Выйти».
  await expect(page.getByText('Отключаться после каждого анализа')).toHaveCount(0)
  expect(await noHorizontalScroll(page)).toBe(true)

  await page.getByRole('button', { name: 'Выйти', exact: true }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog).toContainText('Отчёты останутся')
  await dialog.getByRole('button', { name: 'Выйти', exact: true }).click()
  await page.waitForURL('**/login')
})

test('signing in as another user reloads the profile photo', async ({ page }) => {
  let requests = 0
  await page.route('**/api/v1/auth/avatar', (route) => {
    requests += 1
    return route.fulfill({
      contentType: 'image/png',
      body: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1kAAAAASUVORK5CYII=',
        'base64',
      ),
    })
  })
  await signIn(page)
  await expect.poll(() => requests).toBe(1)
  await page.goto('/account')
  await page.getByRole('button', { name: 'Выйти', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Выйти', exact: true }).click()
  await page.waitForURL('**/login')
  await signIn(page)
  await expect.poll(() => requests).toBe(2)
})

test('a late dialog response cannot populate the next account', async ({ page }) => {
  const marker = 'Previous account private chat'
  let previousAccount = true
  let held = 0
  let release: () => void = () => undefined
  const released = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/api/v1/parse/dialogs', async (route) => {
    if (!previousAccount) return route.continue()
    const response = await route.fetch()
    const data = await response.json()
    data.dialogs[0].title = marker
    held += 1
    await released
    await route.fulfill({ response, json: data })
  })
  try {
    await signIn(page)
    await expect.poll(() => held).toBeGreaterThan(0)
    await page.goto('/account')
    await page.getByRole('button', { name: 'Выйти', exact: true }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Выйти', exact: true }).click()
    await page.waitForURL('**/login')
    previousAccount = false
    await signIn(page, { navigate: false })
    // The chat list of the new account, opened inside the app (a reload would start a fresh page).
    await page
      .getByRole('link', { name: 'Новый анализ' })
      .or(page.getByRole('button', { name: 'Новый анализ' }))
      .first()
      .click()
    await expect(page.locator('.chat-row').filter({ hasText: 'Катя' })).toBeVisible()
    const lateResponse = page.waitForResponse('**/api/v1/parse/dialogs')
    release()
    await (await lateResponse).finished()
    await page.evaluate(
      () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
    )
    await expect(page.getByText(marker, { exact: true })).toHaveCount(0)
    expect(await page.evaluate(() => localStorage.getItem('tg-analyzer:dialogs'))).not.toContain(marker)
  } finally {
    release()
  }
})

test('the recap opens as stories with both names and saves a slide', async ({ page }, testInfo) => {
  await signIn(page)
  await analyseChat(page, 'Катя')
  await expect(page.locator('.toast').getByText('Отчёт готов', { exact: true })).toBeVisible({ timeout: 30_000 })
  await page.goto('/chat/1006')
  await expect(page.getByRole('heading', { name: 'Катя', exact: true })).toBeVisible({ timeout: 15_000 })

  // Match the fixed 9:16 export, which has less vertical room than a tall phone.
  await page.setViewportSize({ width: 360, height: 640 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator('#header-page').getByRole('button', { name: 'Поделиться' }).click()
  // A phone's sheet offers «Итоги» as its first tile.
  await page.getByRole('dialog').getByRole('button', { name: 'Смотреть', exact: true }).click()

  const stories = page.getByRole('dialog', { name: 'Итоги переписки' })
  // Up to four dense slides: the overview with the total first, then what the data allows.
  await expect.poll(() => stories.locator('.stories__segment').count()).toBeGreaterThanOrEqual(2)
  await expect(stories.locator('.stories__stage .frame__title')).toHaveText('Катя')
  await expect(stories.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')

  const download = page.waitForEvent('download')
  await stories.getByRole('button', { name: 'Сохранить' }).click()
  const saved = await download
  expect(saved.suggestedFilename()).toMatch(/^tg-analyzer-[a-z]+\.png$/)
  const path = testInfo.outputPath('recap.png')
  await saved.saveAs(path)
  const png = await readFile(path)
  expect(png.subarray(1, 4).toString()).toBe('PNG')
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1080, 1920])
})

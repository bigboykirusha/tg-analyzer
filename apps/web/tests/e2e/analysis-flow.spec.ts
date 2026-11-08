import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { backendAvailable, gotoHydrated, noHorizontalScroll, openChapter, signIn, usePreferences } from './helpers'

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
  const row = page.locator('.chat-row').filter({ hasText: 'Катя' })
  await row.getByRole('button', { name: 'Разобрать', exact: true }).click()
  await expect(page.locator('.toast').getByText('Отчёт готов', { exact: true })).toBeVisible({ timeout: 30_000 })

  // The very first report opens by itself.
  await page.waitForURL('**/chat/1006')
  await page.goto('/dashboard')
  // With a first report the home page turns into the summary; the chat list lives on /new.
  await expect(page.getByRole('heading', { name: 'Главная' })).toBeVisible()
  if (page.viewportSize()!.width <= 640) {
    // Reports are small posters two to a row: the name fits its card.
    await expect
      .poll(() =>
        page
          .locator('.report-card__title')
          .first()
          .evaluate((element) => element.scrollWidth <= element.clientWidth),
      )
      .toBe(true)
    // The busiest chats of the month without a report wait in «Ещё не разобраны»; each starts its analysis.
    const waiting = page.locator('.unanalysed__item').first()
    await expect(waiting).toHaveAccessibleName(/^Разобрать чат/)
    expect(await waiting.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
  }
  await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true, animations: 'disabled' })
  await page.goto('/new')
  await page.locator('.chat-row').filter({ hasText: 'Катя' }).getByRole('link', { name: 'Открыть отчёт' }).click()
  await page.waitForURL('**/chat/1006')
  await expect(page.getByRole('heading', { name: 'Катя', exact: true })).toBeVisible()

  // One long page: the nav jumps to each part and marks it.
  for (const [tab, part] of [
    ['Время', 'time'],
    ['О чём', 'words'],
    ['Вы двое', 'together'],
  ]) {
    await openChapter(page, tab)
    await expect(page.locator(`#part-${part}`)).toBeInViewport()
    if (page.viewportSize()!.width > 900)
      await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true')
    else await expect(page.locator('.capsule__status')).toContainText(tab)
  }
  await expect.poll(() => noHorizontalScroll(page)).toBe(true)
  // «октябрь 2026 г.» on the axis under the pulse (on the poster; a short chat has no chapters) never breaks before «г.».
  const month = page.locator('.poster .pulse__axis span').first()
  expect(
    await month.evaluate((element) => {
      const text = element.textContent!
      const match = /\d{4}\s+г\./u.exec(text)!
      const range = document.createRange()
      range.setStart(element.firstChild!, match.index + 3)
      range.setEnd(element.firstChild!, match.index + 4)
      const yearTop = range.getBoundingClientRect().top
      const suffix = text.indexOf('г.', match.index)
      range.setStart(element.firstChild!, suffix)
      range.setEnd(element.firstChild!, suffix + 2)
      return Math.abs(yearTop - range.getBoundingClientRect().top)
    }),
  ).toBeLessThan(1)

  await page.goto('/new')
  await expect(
    page.locator('.chat-row').filter({ hasText: 'Катя' }).getByRole('link', { name: 'Открыть отчёт' }),
  ).toBeVisible()
})

test('group chats get the group report', async ({ page }, testInfo) => {
  await signIn(page)
  const row = page.locator('.chat-row').filter({ hasText: 'Weekend plans' })
  await row.getByRole('button', { name: 'Разобрать', exact: true }).click()
  await expect(page.locator('.toast').getByText('Отчёт готов', { exact: true })).toBeVisible({ timeout: 60_000 })

  await page.goto('/chat/-1002004')
  for (const [tab, part] of [
    ['Общение', 'talk'],
    ['Время', 'time'],
    ['Люди', 'people'],
  ]) {
    await openChapter(page, tab)
    await expect(page.locator(`#part-${part}`)).toBeInViewport()
  }
  const member = page.locator('.member').first()
  const memberName = await member.locator('.member__name').innerText()
  await member.click()
  if (testInfo.project.name !== 'desktop') {
    const details = page.getByRole('dialog', { name: memberName, exact: true })
    await expect(details).toBeVisible()
    await expect(details.getByText('С кем общается чаще всего', { exact: true })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('member-details.png'), animations: 'disabled' })
    await details.getByRole('button', { name: 'Закрыть', exact: true }).click()
    await expect(details).toBeHidden()
    await expect(member).toBeFocused()
  } else {
    await expect(page.getByRole('heading', { name: memberName, exact: true })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }
  // The pair statistics stay in the report.
  await expect(page.getByRole('heading', { name: 'Самые плотные пары' })).toBeVisible()
})

test('a completed analysis is recovered when websocket progress is unavailable', async ({ page }) => {
  test.setTimeout(60_000)
  await page.routeWebSocket('**/ws/parse-progress**', (socket) => socket.close())
  await signIn(page)
  await page
    .locator('.chat-row')
    .filter({ hasText: 'Катя' })
    .getByRole('button', { name: 'Разобрать', exact: true })
    .click()
  await page.waitForURL('**/chat/1006', { timeout: 30_000 })
  await expect(page.getByRole('heading', { name: 'Катя', exact: true })).toBeVisible()
})

test('code autofill and two-step verification complete sign-in', async ({ page }) => {
  await gotoHydrated(page, '/login')
  const phone = `900${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}9`
  await page.locator('.phone-input').fill(phone)
  await page.getByRole('button', { name: 'Получить код' }).click()
  await page.locator('.otp-input').first().fill('12345')
  await page.getByRole('button', { name: 'Подтвердить код' }).click()
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
  await expect(dialog.getByRole('button', { name: 'Выйти и удалить отчёты' })).toBeVisible()
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
    if (await page.locator('.sidebar__foot').isVisible()) {
      await page.locator('.sidebar__foot').click()
      await page.getByRole('button', { name: 'Выйти', exact: true }).click()
      await page.getByRole('alertdialog').getByRole('button', { name: 'Выйти', exact: true }).click()
    } else {
      await page.locator('.account-trigger').click()
      await page.getByRole('menuitem', { name: 'Выйти', exact: true }).click()
    }
    await page.waitForURL('**/login')
    previousAccount = false
    await signIn(page, { navigate: false })
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
  const row = page.locator('.chat-row').filter({ hasText: 'Катя' })
  await row.getByRole('button', { name: 'Разобрать', exact: true }).click()
  await expect(page.locator('.toast').getByText('Отчёт готов', { exact: true })).toBeVisible({ timeout: 30_000 })
  await page.goto('/chat/1006')
  await expect(page.getByRole('heading', { name: 'Катя', exact: true })).toBeVisible({ timeout: 15_000 })

  // Match the fixed 9:16 export, which has less vertical room than a tall phone.
  await page.setViewportSize({ width: 360, height: 640 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator('#header-page').getByRole('button', { name: 'Поделиться' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Смотреть итоги' }).click()

  const stories = page.getByRole('dialog', { name: 'Итоги переписки' })
  // Up to four dense slides: the overview with the total first, then what the data allows.
  await expect.poll(() => stories.locator('.stories__segment').count()).toBeGreaterThanOrEqual(2)
  await expect(stories.locator('.stories__stage .story-slide__heading strong')).toHaveText(/Demo\s*&\s*Катя/)
  await expect(stories.locator('.stories__stage .story-slide__title')).toHaveText(/^\d[\d\s]*$/)
  await page.keyboard.press('ArrowRight')
  await expect
    .poll(() =>
      stories.locator('.stories__stage .story-slide').evaluate((slide) => {
        const grid = slide.querySelector('.story-slide__grid')!
        const brand = slide.querySelector('.story-slide__brand')!
        return brand.getBoundingClientRect().top - grid.getBoundingClientRect().bottom
      }),
    )
    .toBeGreaterThanOrEqual(8)
  await expect(stories.locator('.stories__stage .story-slide__heading strong')).toHaveText(/Demo\s*&\s*Катя/)

  await stories.getByRole('button', { name: 'Поделиться' }).click()
  for (const option of ['Сторис в Instagram', 'Сторис в Telegram', 'Отправить в чат']) {
    await expect(stories.getByRole('menuitem', { name: new RegExp(option) })).toBeVisible()
  }
  await stories.getByRole('button', { name: 'Отмена' }).click()

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

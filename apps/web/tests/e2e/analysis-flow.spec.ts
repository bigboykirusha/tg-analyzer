import { expect, test } from '@playwright/test'
import type { ReportDto } from '@tg-analyzer/shared'
import { readFile } from 'node:fs/promises'
import {
  analyseChat,
  assertFakeTelegram,
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
  // The very first report opens by itself (no banner: it is on screen).
  await page.waitForURL('**/chat/1006', { timeout: 30_000 })
  await page.goto('/dashboard')
  // With a first report the home page turns into the summary: the report is a card.
  const card = page.locator('.home-card').filter({ hasText: 'Катя' })
  await expect(card).toBeVisible()
  // The desktop column is the same on every page: the library keeps the reports list too.
  if (testInfo.project.name === 'desktop') {
    await expect(page.locator('.sidebar__list a[href="/chat/1006"]')).toBeVisible()
  }
  expect(await card.locator('.home-card__name').evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
    true,
  )
  await page.screenshot({ path: testInfo.outputPath('dashboard.png'), fullPage: true, animations: 'disabled' })
  await card.getByRole('link', { name: 'Катя' }).click()
  await page.waitForURL('**/chat/1006')
  await expect(page.getByRole('heading', { name: 'Катя', exact: true })).toBeVisible()
  if (testInfo.project.name === 'desktop') {
    await expect(page.locator('.sidebar__list a[aria-current="page"]')).toHaveAttribute('href', '/chat/1006')
  }

  // One short page of cards: the balance is always there; a card the chat is too small for is not drawn.
  await expect(page.locator('.report-section')).not.toHaveCount(0)
  await openCard(page, 'balance')
  await expect(page.locator('#part-balance')).toBeInViewport()
  await expect(page.locator('#part-match table')).toBeVisible()
  await expect(page.locator('.page-bar__lede')).toHaveCount(0)
  await expect.poll(() => noHorizontalScroll(page)).toBe(true)
  await page.goto('/new')
  await expect(page.locator('.chat-row a[href="/chat/1006"]')).toBeVisible()
})

test('the report explains a one-sided chat and shows all tied weekdays', async ({ page }) => {
  await signIn(page)
  await analyseChat(page, 'Катя')
  await page.waitForURL('**/chat/1006', { timeout: 30_000 })
  await page.route('**/api/v1/reports/1006', async (route) => {
    const response = await route.fetch()
    const data: ReportDto = await response.json()
    data.report.totals.sent = data.report.totals.messages
    data.report.totals.received = 0
    data.report.responses.mineSamples = 2
    data.report.responses.theirsSamples = 2
    data.report.activity.weekday = [1, 30, 30, 4, 2, 1, 0].map((total) => ({ sent: total, received: 0, total }))
    await route.fulfill({ response, json: data })
  })
  await gotoHydrated(page, '/chat/1006')
  await expect(page.locator('#part-balance')).toContainText('100 на 0')
  await expect(page.locator('#part-balance')).toContainText('Все сообщения от вас')
  await expect(page.locator('#part-match')).toBeVisible()
  await expect(page.getByRole('rowheader', { name: 'Обычное время ответа' })).toHaveCount(0)
  await expect(page.locator('#part-relation')).toHaveCount(0)
  await expect(page.locator('#part-week')).toContainText('Больше всего сообщений по понедельникам и по вторникам')
})

test('the first report opens by itself when the analysis starts on the home page', async ({ page }, testInfo) => {
  await signIn(page)
  // A newcomer: «С кого начнём?» and the whole chat list under it, each row with «Разобрать».
  await expect(page.getByRole('heading', { name: 'С кого начнём?' })).toBeVisible()
  await page
    .locator('.chat-row')
    .filter({ hasText: 'Мила' })
    .first()
    .getByRole('button', { name: /^Разобрать чат/ })
    .click()
  await page.waitForURL('**/chat/**', { timeout: 30_000 })
  if (testInfo.project.name !== 'desktop') {
    const calendar = page.locator('#part-streak .calendar')
    const earlier = calendar.getByRole('button', { name: 'Показать предыдущие месяцы' })
    await expect(calendar.locator('.month__name:visible').first()).toHaveText(/^\p{L}+\s+\d{4}$/u)
    await expect(calendar.locator('.month--old').first()).toBeHidden()
    await earlier.click()
    await expect(calendar.locator('.month--old').first()).toBeVisible()
    await expect(calendar.getByRole('button', { name: 'Свернуть предыдущие месяцы' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  }
})

test('a chat with too few messages has no «Разобрать» in the full list', async ({ page }) => {
  await signIn(page)
  await expect(page.locator('.chat-row').first()).toBeVisible()
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

test('a keyboard start preserves focus through progress and the queue', async ({ page }, testInfo) => {
  // A phone goes back home to watch a started analysis (16.11): the list keeps the focus on a computer.
  test.skip(testInfo.project.name !== 'desktop', 'a phone returns home after a start')
  await signIn(page)
  const jobId = '00000000-0000-4000-8000-000000000001'
  const queuedJob = { jobId: '00000000-0000-4000-8000-000000000002', chatId: '1006', chatTitle: 'Катя' }
  const requests: string[] = []
  let reading = false
  let inQueue = false
  let cancelled: string | undefined
  let releaseStart = () => {}
  const startPending = new Promise<void>((resolve) => (releaseStart = resolve))
  await page.route('**/api/v1/parse/start', async (route) => {
    const { chatId } = route.request().postDataJSON()
    requests.push(chatId)
    if (chatId === queuedJob.chatId) {
      inQueue = true
      await route.fulfill({ status: 202, json: { jobId: queuedJob.jobId } })
    } else {
      await startPending
      reading = true
      await route.fulfill({ status: 202, json: { jobId } })
    }
  })
  await page.route('**/api/v1/parse/cancel', async (route) => {
    cancelled = route.request().postDataJSON().jobId
    inQueue = false
    await route.fulfill({ json: { success: true } })
  })
  await page.route('**/api/v1/parse/status*', (route) =>
    route.fulfill({
      json: {
        jobId: reading ? jobId : null,
        status: reading ? 'running' : 'idle',
        phase: reading ? 'scanning' : null,
        chatId: reading ? '1005' : null,
        chatTitle: reading ? 'Дима (работа)' : null,
        scannedMessages: 1638,
        totalMessages: 2600,
        startedAt: reading ? Date.now() - 20_000 : null,
        waitSeconds: null,
        error: null,
        queued: inQueue ? [queuedJob] : [],
      },
    }),
  )
  await page.routeWebSocket('**/ws/parse-progress**', (socket) => socket.close())
  await gotoHydrated(page, '/new')
  const row = page.locator('.chat-row').filter({ hasText: 'Дима (работа)' })
  const start = row.getByRole('button', { name: 'Разобрать чат «Дима (работа)»' })
  await start.focus()
  try {
    await page.keyboard.press('Enter')
    await expect(start).toHaveAttribute('aria-busy', 'true')
    await expect(start.locator('.spinner')).toBeVisible()
    await page.keyboard.press('Enter')
  } finally {
    releaseStart()
  }
  await expect(row.getByRole('button', { name: 'Разбираем чат «Дима (работа)», 63%' })).toBeFocused()
  await expect(page).toHaveURL(/\/new$/)
  expect(requests).toEqual(['1005'])

  const secondRow = page.locator('.chat-row').filter({ hasText: queuedJob.chatTitle })
  const secondStart = secondRow.getByRole('button', { name: 'Разобрать чат «Катя»' })
  await secondStart.focus()
  await page.keyboard.press('Enter')
  const cancelQueued = secondRow.getByRole('button', { name: 'Убрать «Катя» из очереди' })
  await expect(cancelQueued).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(secondStart).toBeFocused()
  expect(cancelled).toBe(queuedJob.jobId)
  expect(requests).toEqual(['1005', queuedJob.chatId])
})

test('group chats get the group report', async ({ page }, testInfo) => {
  await signIn(page)
  await analyseChat(page, 'Weekend plans')
  // A newcomer's first report opens by itself.
  await page.waitForURL('**/chat/-1002004', { timeout: 60_000 })
  await page.goto('/chat/-1002004')
  await expect(page.locator('#part-people')).toContainText('Пишут почти поровну')
  for (const part of ['people', 'roles', 'pairs', 'time', 'week', 'words']) {
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
  await expect(page.locator('#part-pairs .list-row__subtitle').first()).toContainText(/Прямых ответов|Соседних реплик/)

  await page.route('**/api/v1/reports/-1002004', async (route) => {
    const response = await route.fetch()
    const data: ReportDto = await response.json()
    for (const participant of data.report.group?.participants ?? []) participant.starterShare = 25
    await route.fulfill({ response, json: data })
  })
  await gotoHydrated(page, '/chat/-1002004')
  await expect(page.locator('#part-people')).toBeVisible()
  await expect(page.locator('#part-roles').getByText('Заводит разговоры', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Несколько участников начинают по 25% разговоров')).toBeVisible()
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
  await assertFakeTelegram(page)
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
    await expect(page.getByRole('heading', { name: 'Выберите чат' })).toBeVisible()
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
    // A newcomer's home is the chat list: its request is held while this account signs out.
    await expect.poll(() => held).toBeGreaterThan(0)
    await page.locator('a[href="/account"]:visible').first().click()
    await page.waitForURL('**/account')
    await page.getByRole('button', { name: 'Выйти', exact: true }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Выйти', exact: true }).click()
    await page.waitForURL('**/login')
    previousAccount = false
    await signIn(page, { navigate: false })
    // The chat list of the new account, on its home inside the app (a reload would start a fresh page).
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
  await page.waitForURL('**/chat/1006', { timeout: 30_000 })
  await page.goto('/chat/1006')
  await expect(page.getByRole('heading', { name: 'Катя', exact: true })).toBeVisible({ timeout: 15_000 })

  // Match the fixed 9:16 export, which has less vertical room than a tall phone.
  await page.setViewportSize({ width: 360, height: 640 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.locator('#header-page').getByRole('button', { name: 'Поделиться' }).click()
  // The sheet's first row opens «Итоги».
  await page.getByRole('dialog').getByRole('button', { name: 'Смотреть итоги' }).click()

  const stories = page.getByRole('dialog', { name: 'Итоги переписки' })
  // A private chat has up to four frames: the cover first, then what the data allows.
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

test('a running analysis shows away from home and its button opens the details', async ({ page }, testInfo) => {
  await signIn(page)
  // A newcomer's home is the list of chats («С кого начнём?»).
  await expect(page.locator('.chat-row').first()).toBeVisible()
  // A long analysis, as the status endpoint tells it: «Дима (работа)» at 63 %.
  await page.route('**/api/v1/parse/status*', (route) =>
    route.fulfill({
      json: {
        jobId: '00000000-0000-4000-8000-000000000001',
        status: 'running',
        phase: 'scanning',
        chatId: '1005',
        chatTitle: 'Дима (работа)',
        scannedMessages: 1638,
        totalMessages: 2600,
        startedAt: Date.now() - 20_000,
        waitSeconds: null,
        error: null,
        queued: [],
      },
    }),
  )
  await gotoHydrated(page, '/new')
  // The chat's own button reads the percentage and opens the running analysis, where it can be cancelled.
  const row = page.locator('.chat-row').filter({ hasText: 'Дима (работа)' })
  const rowProgress = row.getByRole('button', { name: 'Разбираем чат «Дима (работа)», 63%' })
  await rowProgress.focus()
  await page.keyboard.press('Enter')
  const details = page.getByRole('dialog', { name: 'Разбираем переписку' })
  await expect(details.getByRole('button', { name: 'Отменить разбор' })).toBeVisible()
  await expect(details).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(details).toBeHidden()
  await expect(rowProgress).toBeFocused()
  const desktop = testInfo.project.name === 'desktop'
  if (!desktop) {
    await page.keyboard.press('Enter')
    const grab = details.locator('.modal-grab')
    await expect(grab).toBeVisible()
    await expect(page.locator('.sheet-layer.sheet-enter-active')).toHaveCount(0)
    const handle = (await grab.boundingBox())!
    const x = handle.x + handle.width / 2
    const y = handle.y + handle.height / 2
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x, y + 120, { steps: 8 })
    await expect(page.locator('.sheet-layer[data-sheet="drag"]')).toBeVisible()
    await page.mouse.up()
    await expect(details).toBeHidden()
    await expect(rowProgress).toBeFocused()
  }
  // The same chat list stays visible until the first report is ready.
  await gotoHydrated(page, '/dashboard')
  await expect(page.getByRole('heading', { name: 'Первый отчёт' })).toBeVisible()
  await expect(row).toBeVisible()
  const progress = page.locator(desktop ? '.sidebar__foot' : '.action-bar')
  await expect(progress).toContainText('63%')
  await progress.getByRole('button', { name: 'Разбираем «Дима (работа)». 63%', exact: false }).click()
  await expect(details.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '63')
  await page.keyboard.press('Escape')
  await expect(details).toBeHidden()
  // A phone has no sidebar card: away from home the analysis is the line along the top of the screen.
  if (!desktop) {
    await gotoHydrated(page, '/account')
    await expect(page.locator('.app-bar__progress')).toHaveAttribute('aria-valuenow', '63')
  }
})

test('a phone keeps «Разобрать чат» in a bar along the bottom of home, opening the chat picker', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'desktop', 'the bar is at the bottom of home only on phones and tablets')
  await signIn(page)
  await analyseChat(page, 'Катя')
  await page.waitForURL('**/chat/1006', { timeout: 30_000 })
  await gotoHydrated(page, '/dashboard')
  // Home shows the reports and the bar at the bottom; no row of people on a phone.
  await expect(page.locator('.home-card').filter({ hasText: 'Катя' })).toBeVisible()
  await expect(page.locator('.more')).toHaveCount(0)
  await page.locator('.action-bar').getByRole('link', { name: 'Разобрать чат' }).click()
  await page.waitForURL('**/new')
  await expect(page.getByRole('heading', { name: 'Выберите чат' })).toBeVisible()
  await expect(page.locator('.picker').getByRole('heading', { level: 2 })).toHaveText(['Без отчёта', 'Отчёты'])
  await expect(
    page
      .locator('.chat-row')
      .first()
      .getByRole('button', { name: /^Разобрать чат/ }),
  ).toBeVisible()
  const search = page.getByRole('searchbox')
  await search.fill('абракадабра')
  await page.getByRole('button', { name: 'Сбросить поиск' }).click()
  await expect(search).toBeFocused()
  await expect(page.locator('.chat-row').first()).toBeVisible()
})

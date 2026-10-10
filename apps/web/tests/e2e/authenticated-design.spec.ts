import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const user = {
  id: '00000000-0000-4000-8000-000000000001',
  tgUserId: '10001',
  username: 'signal_user',
  firstName: 'Alex',
  timezone: 'Europe/Moscow',
  telegramSessionActive: true,
}

const accessToken = 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjQxMDI0NDQ4MDB9.signature'

const chats = [
  {
    tgChatId: '101',
    chatName: 'Product team',
    chatType: 'group',
    totalMessages: 12840,
    parsedAt: '2026-10-08T18:30:00.000Z',
  },
  {
    tgChatId: '102',
    chatName: 'Mila',
    chatType: 'private',
    totalMessages: 7248,
    parsedAt: '2026-10-07T12:15:00.000Z',
  },
]

const history = [
  {
    jobId: '00000000-0000-4000-8000-000000000101',
    chatId: '101',
    chatName: 'Product team',
    status: 'completed',
    totalChats: 1,
    parsedChats: 1,
    totalMessages: 12840,
    createdAt: '2026-10-08T18:28:00.000Z',
    startedAt: '2026-10-08T18:28:10.000Z',
    completedAt: '2026-10-08T18:30:00.000Z',
  },
  {
    jobId: '00000000-0000-4000-8000-000000000102',
    chatId: '102',
    chatName: 'Mila',
    status: 'completed',
    totalChats: 1,
    parsedChats: 1,
    totalMessages: 7248,
    createdAt: '2026-10-07T12:13:00.000Z',
    startedAt: '2026-10-07T12:13:10.000Z',
    completedAt: '2026-10-07T12:15:00.000Z',
  },
]

const report = {
  tgChatId: '102',
  chatName: 'Александра',
  chatType: 'private',
  totalMessages: 119,
  sentMessages: 64,
  receivedMessages: 55,
  totalChars: 5680,
  totalWords: 845,
  textMessageCount: 117,
  mediaCount: 0,
  voiceCount: 0,
  stickerCount: 2,
  fileCount: 0,
  firstMessageAt: '2026-10-01T08:00:00.000Z',
  lastMessageAt: '2026-10-01T22:45:00.000Z',
  parsedAt: '2026-10-08T18:30:00.000Z',
  averageMyResponseSec: 75,
  medianMyResponseSec: 42,
  medianTheirResponseSec: 58,
  myWordsPerMessage: 7.3,
  theirWordsPerMessage: 6.9,
  iWriteFirstPct: 54,
  responseRate: 96,
  topWords: [],
  topEmoji: [],
  hourlyActivity: {},
  dailyActivity: [
    { date: '2026-09-26', sent: 8, received: 6, total: 14 },
    { date: '2026-09-27', sent: 11, received: 9, total: 20 },
    { date: '2026-09-28', sent: 6, received: 8, total: 14 },
    { date: '2026-09-29', sent: 13, received: 10, total: 23 },
    { date: '2026-09-30', sent: 9, received: 7, total: 16 },
    { date: '2026-10-01', sent: 17, received: 15, total: 32 },
  ],
  weekdayActivity: {
    '0': { sent: 6, received: 5, total: 11 },
    '1': { sent: 8, received: 7, total: 15 },
    '2': { sent: 7, received: 6, total: 13 },
    '3': { sent: 9, received: 8, total: 17 },
    '4': { sent: 15, received: 13, total: 28 },
    '5': { sent: 11, received: 9, total: 20 },
    '6': { sent: 8, received: 7, total: 15 },
  },
  monthlyActivity: [
    { month: '2026-05', sent: 6, received: 4, total: 10 },
    { month: '2026-06', sent: 7, received: 5, total: 12 },
    { month: '2026-07', sent: 6, received: 6, total: 12 },
    { month: '2026-08', sent: 11, received: 9, total: 20 },
    { month: '2026-09', sent: 16, received: 14, total: 30 },
    { month: '2026-10', sent: 18, received: 17, total: 35 },
  ],
  hourlyActivitySplit: {
    '9': { sent: 8, received: 5, total: 13 },
    '14': { sent: 12, received: 10, total: 22 },
    '18': { sent: 15, received: 14, total: 29 },
    '22': { sent: 29, received: 26, total: 55 },
  },
  topWordsBySender: {
    mine: [
      { value: 'дизайн', count: 14 },
      { value: 'вечер', count: 10 },
      { value: 'идея', count: 8 },
    ],
    theirs: [
      { value: 'точно', count: 12 },
      { value: 'встреча', count: 9 },
      { value: 'завтра', count: 7 },
    ],
  },
  topEmojiBySender: {
    mine: [
      { value: '🙂', count: 9 },
      { value: '🔥', count: 5 },
    ],
    theirs: [
      { value: '❤️', count: 8 },
      { value: '✨', count: 4 },
    ],
  },
  uniqueWordsBySender: {
    mine: [
      { value: 'набросок', count: 6 },
      { value: 'ритм', count: 5 },
    ],
    theirs: [
      { value: 'уютно', count: 6 },
      { value: 'прогулка', count: 4 },
    ],
  },
  responseStats: {
    medianMineSec: 42,
    medianTheirsSec: 58,
    mineSamples: 30,
    theirsSamples: 27,
    mineP25Sec: 18,
    mineP75Sec: 130,
    mineP95Sec: 480,
    theirsP25Sec: 24,
    theirsP75Sec: 165,
    theirsP95Sec: 620,
  },
  conversationFacts: {
    activeDays: 6,
    longestGap: null,
    mostActiveDate: { date: '2026-10-01', total: 32 },
    maxStreakDays: 6,
    maxStreak: { days: 6, startDate: '2026-09-26', endDate: '2026-10-01' },
    firstMessageAt: '2026-10-01T08:00:00.000Z',
    silencePeriodsOver30Days: [],
    trend: 'growing',
    mostActiveMonth: '2026-10',
    sessionStats: {
      totalSessions: 9,
      averageSessionMessages: 13.2,
      averageSessionDurationSec: 1960,
      longestSessionMessages: 28,
      longestSessionDurationSec: 5400,
      sessionsPerActiveWeek: 7.2,
      nightSessionsPct: 22,
      highlights: [
        {
          startedAt: '2026-10-01T19:20:00.000Z',
          endedAt: '2026-10-01T20:50:00.000Z',
          durationSec: 5400,
          totalMessages: 28,
          sentMessages: 15,
          receivedMessages: 13,
        },
      ],
    },
    relationshipScore: {
      score: 56,
      label: 'one_sided',
      reciprocity: 92,
      responsiveness: 100,
      stability: 12,
      attentionBalance: 54,
    },
    insights: [],
  },
  wordsPerMessage: { mine: 7.3, theirs: 6.9 },
  messageComposition: { text: 117, media: 0, voice: 0, sticker: 2, file: 0 },
  activityDistribution: {
    night: { sent: 5, received: 4, total: 9 },
    morning: { sent: 10, received: 8, total: 18 },
    afternoon: { sent: 18, received: 16, total: 34 },
    evening: { sent: 31, received: 27, total: 58 },
  },
  compositionStats: {
    textSharePct: 98.3,
    mediaSharePct: 0,
    voiceSharePct: 0,
    stickerSharePct: 1.7,
    fileSharePct: 0,
    avgCharsPerTextMessage: 48.5,
  },
  availabilityProfile: {
    activeHours: 8,
    activeHoursPct: 33,
    concentrationIndex: 4.2,
    predictability: 'high',
    peakWindow: '21:00-00:00',
    secondaryWindow: '13:00-16:00',
  },
  healthScore: {
    score: 68,
    label: 'steady',
    responseRate: 96,
    fragmentation: 72,
    initiativeBalance: 54,
    longTermStability: 58,
  },
  groupReport: null,
}

const groupReport = {
  ...report,
  tgChatId: '101',
  chatName: 'Product team',
  chatType: 'group',
  groupReport: {
    participants: [
      {
        id: '1',
        name: 'Alex',
        isSelf: true,
        role: 'anchor',
        messageCount: 64,
        messageShare: 53.8,
        wordCount: 360,
        avgWordsPerMessage: 6,
        mediaCount: 0,
        mediaShare: 0,
        firstSeen: '2026-09-26T08:00:00.000Z',
        lastSeen: '2026-10-01T20:00:00.000Z',
        activeDays: 6,
        consistencyScore: 80,
        starterCount: 5,
        starterShare: 50,
        replyCount: 12,
        repliesReceived: 10,
        magnetScore: 50,
        replyRatio: 50,
        topWords: [],
        topEmoji: [],
        topicSignature: [],
      },
      {
        id: '2',
        name: 'Mila',
        isSelf: false,
        role: 'contributor',
        messageCount: 55,
        messageShare: 46.2,
        wordCount: 240,
        avgWordsPerMessage: 6,
        mediaCount: 0,
        mediaShare: 0,
        firstSeen: '2026-09-26T08:00:00.000Z',
        lastSeen: '2026-10-01T19:00:00.000Z',
        activeDays: 5,
        consistencyScore: 70,
        starterCount: 5,
        starterShare: 50,
        replyCount: 10,
        repliesReceived: 12,
        magnetScore: 50,
        replyRatio: 50,
        topWords: [],
        topEmoji: [],
        topicSignature: [],
      },
    ],
    topPairs: [],
    health: {
      giniCoefficient: 0.1,
      lurkerRatio: 0,
      retentionRate: null,
      responseCoverage: 70,
      consistency: 75,
      momentum: 'unknown',
      activeMembers: 2,
      activeMembersLast30Days: 2,
      churnedMembers: 0,
      peakSimultaneity: 2,
    },
    sharedVocabulary: [],
    uniqueGroupWords: [],
  },
}

async function mockApi(page: Page) {
  await page.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname

    if (path.endsWith('/auth/refresh')) {
      return route.fulfill({ json: { accessToken, user } })
    }
    if (path.endsWith('/auth/profile')) {
      return route.fulfill({ json: { user } })
    }
    if (path.endsWith('/parse/status')) {
      return route.fulfill({
        json: {
          jobId: null,
          status: 'idle',
          progress: { current: 0, total: 0, chatId: null, chatName: '', status: 'idle' },
        },
      })
    }
    if (path.endsWith('/parse/dialogs')) {
      return route.fulfill({
        json: {
          dialogs: [
            { id: '101', title: 'Product team', type: 'group' },
            { id: '102', title: 'Mila', type: 'private' },
            { id: '103', title: 'Weekend plans', type: 'group' },
            { id: '104', title: 'Design notes', type: 'private' },
          ],
          truncated: false,
          total: 4,
        },
      })
    }
    if (path.endsWith('/parse/history')) {
      return route.fulfill({ json: { items: history, total: history.length, page: 1, limit: 20 } })
    }
    if (path.endsWith('/stats/chats')) {
      return route.fulfill({ json: { chats, total: chats.length, page: 1, limit: 20 } })
    }
    if (path.endsWith('/stats/chats/102')) {
      return route.fulfill({ json: report })
    }
    if (path.endsWith('/stats/chats/101')) {
      return route.fulfill({ json: groupReport })
    }

    return route.fulfill({ status: 404, json: { code: 'NOT_FOUND', message: 'Not found in design fixture' } })
  })
}

for (const width of [320, 360, 390, 768, 1024]) {
  test.describe(`viewport ${width}`, () => {
    test.use({ isMobile: width < 768, hasTouch: width < 768 })
    test(`loading and loaded content fit ${width}px`, async ({ page }) => {
      await mockApi(page)
      await page.setViewportSize({ width, height: 844 })
      for (const path of ['/dashboard', '/history', '/chat/102']) {
        let release!: () => void
        const pending = new Promise<void>((resolve) => {
          release = resolve
        })
        await page.route('**/api/v1/**', async (route) => {
          if (/\/stats\/|\/parse\/history/.test(new URL(route.request().url()).pathname)) await pending
          await route.fallback()
        })
        await page.goto(path)
        await expect(page.locator('.skeleton').first()).toBeVisible({ timeout: 30_000 })
        const overflow = () =>
          page.evaluate(() =>
            Array.from(
              document.querySelectorAll('.app-main, .ui-container, .page-stack, .card, .topbar, .topbar *, .skeleton'),
            )
              .filter((element) => {
                const rect = element.getBoundingClientRect()
                return rect.width > 0 && (rect.right > innerWidth + 1 || rect.left < -1)
              })
              .map((element) => ({ class: element.className, right: element.getBoundingClientRect().right })),
          )
        try {
          expect(await overflow()).toEqual([])
          await page.screenshot({
            path: `test-results/loading-${width}-${path.replaceAll('/', '-')}.png`,
            fullPage: true,
          })
        } finally {
          release()
        }
        await expect(page.locator('.skeleton')).toHaveCount(0, { timeout: 30_000 })
        expect(await overflow()).toEqual([])
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      }
    })
  })
}

const authenticatedViewports = [
  { name: '1280', width: 1280, height: 900 },
  { name: '390', width: 390, height: 844 },
]

test('mobile navigation preserves the shell and cached content', async ({ page }) => {
  await mockApi(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/dashboard')
  await expect(page.locator('.dialog-item').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.dashboard-page-header')).toHaveCount(0)
  await page.locator('.app-navigation').evaluate((element) => {
    element.setAttribute('data-persistence-probe', 'same')
  })
  const documents: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'document') documents.push(request.url())
  })
  await page.locator('.mobile-tabbar a[href="/history"]').click()
  await expect(page.locator('.history-open').first()).toBeVisible()
  await expect(page.locator('.history-page-header')).toHaveCount(0)
  await expect(page.locator('.app-navigation')).toHaveAttribute('data-persistence-probe', 'same')
  await page.locator('.mobile-tabbar a[href="/dashboard"]').click()
  await expect(page.locator('.dialog-item').first()).toBeVisible()
  await expect(page.locator('.skeleton')).toHaveCount(0)
  expect(documents).toEqual([])
  await expect(page.locator('.mobile-security-section')).toHaveCount(0)
  await page.getByRole('button', { name: 'Alex', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Alex' })).toBeVisible()
  await page.getByRole('menuitem', { name: 'Завершить сессию Telegram', exact: true }).click()
  const confirmation = page.getByRole('dialog', { name: 'Завершить сессию Telegram' })
  await expect(confirmation).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden')
  await confirmation.getByRole('button', { name: 'Отмена', exact: true }).click()
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden')
})

test('dialog list continues automatically without a show-more control', async ({ page }) => {
  await mockApi(page)
  const dialogs = Array.from({ length: 42 }, (_, index) => ({
    id: String(1_000 + index),
    title: `Dialog ${index + 1}`,
    type: index % 3 === 0 ? 'group' : 'private',
  }))
  await page.route('**/api/v1/parse/dialogs', (route) =>
    route.fulfill({ json: { dialogs, truncated: false, total: dialogs.length } }),
  )
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/dashboard')
  await expect(page.locator('.dialog-item')).toHaveCount(18, { timeout: 30_000 })
  await expect(page.getByRole('button', { name: 'Показать ещё' })).toHaveCount(0)

  await page.locator('.dialog-load-sentinel').scrollIntoViewIfNeeded()
  await expect(page.locator('.dialog-item')).toHaveCount(36)
  await page.locator('.dialog-load-sentinel').scrollIntoViewIfNeeded()
  await expect(page.locator('.dialog-item')).toHaveCount(42)
  await expect(page.locator('.dialog-load-sentinel')).toHaveCount(0)
})

for (const outcome of ['completed', 'cancelled', 'failed'] as const) {
  test(`mobile analysis: queued, running and ${outcome}`, async ({ page }) => {
    await mockApi(page)
    await page.setViewportSize({ width: 390, height: 844 })
    let phase: string = 'idle'
    let startBody: unknown
    await page.route('**/api/v1/**', async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path.endsWith('/parse/start')) {
        startBody = route.request().postDataJSON()
        phase = 'pending'
        return route.fulfill({ json: { jobId: history[0]!.jobId } })
      }
      if (path.endsWith('/parse/cancel')) {
        phase = 'idle'
        return route.fulfill({ json: { success: true } })
      }
      if (path.endsWith('/parse/status')) {
        return route.fulfill({
          json: {
            jobId: phase === 'idle' ? null : history[0]!.jobId,
            status: phase,
            progress: {
              current: phase === 'pending' ? 0 : 1,
              total: 1,
              chatId: '103',
              chatName: 'Weekend plans',
              status: phase,
              scannedMessages: phase === 'running' ? 2500 : 0,
              startTime: Date.now() - 10000,
              message:
                phase === 'running' ? 'Scanning 2500 messages' : phase === 'failed' ? 'Test analysis failed' : '',
            },
          },
        })
      }
      if (path.endsWith('/stats/chats') && phase === 'completed') {
        return route.fulfill({
          json: {
            chats: [...chats, { ...chats[0], tgChatId: '103', chatName: 'Weekend plans' }],
            total: 3,
            page: 1,
            limit: 20,
          },
        })
      }
      return route.fallback()
    })
    await page.goto('/dashboard')
    const row = page.locator('.dialog-item').filter({ hasText: 'Weekend plans' })
    await expect(row).toBeVisible({ timeout: 30_000 })
    await row.getByRole('button', { name: 'Анализ', exact: true }).click()
    expect(startBody).toEqual({ chatIds: ['103'] })
    await expect(page.getByRole('progressbar')).toBeVisible()
    await expect(row.getByRole('button')).toBeDisabled()
    phase = 'running'
    await expect(page.locator('.progress-card [role="progressbar"]')).toHaveAttribute('aria-valuenow', '4', {
      timeout: 15_000,
    })
    if (outcome === 'completed') {
      await page.locator('.mobile-tabbar a[href="/history"]').click()
      await expect(page.getByRole('progressbar')).toBeVisible()
      await page.locator('.mobile-tabbar a[href="/dashboard"]').click()
      await expect(page.getByRole('progressbar')).toBeVisible()
    }
    await page.screenshot({ path: `test-results/mobile-analysis-${outcome}.png` })
    if (outcome === 'cancelled') {
      await page.locator('.progress-card').getByRole('button').click()
    } else {
      phase = outcome
    }
    await expect(page.getByRole('progressbar')).toHaveCount(0, { timeout: 15_000 })
    if (outcome === 'completed') {
      await expect(row.getByRole('link', { name: 'Отчет', exact: true })).toBeVisible()
    } else {
      await expect(row.getByRole('button', { name: 'Анализ', exact: true })).toBeEnabled()
    }
  })
}
const themes = ['light', 'dark'] as const
const reportTabs = [
  { label: 'Ритм', slug: 'rhythm' },
  { label: 'Слова', slug: 'words' },
  { label: 'Таймлайн', slug: 'timeline' },
] as const

// Playwright requires a destructured fixtures argument to access TestInfo.
// eslint-disable-next-line no-empty-pattern
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'This suite controls its responsive viewports explicitly')
})
test.setTimeout(60_000)

for (const route of ['/dashboard', '/history', '/chat/102']) {
  for (const viewport of authenticatedViewports) {
    for (const theme of themes) {
      test(`${route} stays responsive at ${viewport.name} in ${theme}`, async ({ page }) => {
        await mockApi(page)
        await page.addInitScript(
          ({ selectedTheme }) => {
            localStorage.setItem('tg-analyzer-theme', selectedTheme)
            localStorage.setItem('tg-analyzer-locale', 'ru')
          },
          { selectedTheme: theme },
        )
        await page.setViewportSize(viewport)
        await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 })
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme, { timeout: 30_000 })
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 })

        if (route === '/dashboard') {
          await expect(page.locator('.dialog-item').first()).toBeVisible({ timeout: 30_000 })
        }

        if (route === '/chat/102') {
          await expect(page.locator('.balance-donut')).toBeVisible({ timeout: 30_000 })
          await expect(page.locator('.balance-details')).toContainText('Медианный ответ: вы:')
          await expect(page.locator('.balance-details')).toContainText('собеседник:')
          await expect(page.locator('.composition-item')).toHaveCount(2)
          if (viewport.width <= 768) {
            const tabsBounds = await page.locator('.tabs-scroll.no-print').boundingBox()
            const pageWidth = await page.evaluate(() => document.documentElement.clientWidth)
            expect(tabsBounds?.x).toBe(0)
            expect(tabsBounds?.width).toBe(pageWidth)
          }
        }
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
          .toBe(true)

        const results = await new AxeBuilder({ page }).analyze()
        expect(results.violations).toEqual([])
        await page.evaluate(() => {
          window.scrollTo(0, 0)
          const appMain = document.querySelector<HTMLElement>('.app-main')
          if (appMain) appMain.scrollTop = 0
        })
        await expect(page).toHaveScreenshot(`${route.replaceAll('/', '-').slice(1)}-${viewport.name}-${theme}.png`, {
          fullPage: true,
          animations: 'disabled',
          timeout: 15_000,
        })

        if (route === '/chat/102') {
          for (const reportTab of reportTabs) {
            const tab = page.getByRole('tab', { name: reportTab.label, exact: true })
            await expect(tab).toBeVisible()
            await tab.click()
            await page.waitForTimeout(300)
            await expect(page).toHaveScreenshot(`chat-102-${reportTab.slug}-${viewport.name}-${theme}.png`, {
              fullPage: true,
              animations: 'disabled',
              timeout: 15_000,
            })
          }
        }
      })
    }
  }
}

test('account popover and confirmation dialog expose clear desktop states', async ({ page }) => {
  await mockApi(page)
  await page.addInitScript(() => {
    localStorage.setItem('tg-analyzer-theme', 'light')
    localStorage.setItem('tg-analyzer-locale', 'ru')
  })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 15_000 })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 })

  await page.getByRole('button', { name: 'Alex', exact: true }).click()
  await expect(page.getByRole('menu', { name: 'Alex' })).toBeVisible()
  await expect(page).toHaveScreenshot('dashboard-account-popover-1280-light.png', {
    fullPage: true,
    animations: 'disabled',
    timeout: 15_000,
  })

  await page.getByRole('menuitem', { name: 'Завершить сессию Telegram', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Завершить сессию Telegram' })
  await expect(dialog).toBeVisible()
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
  await expect(page).toHaveScreenshot('dashboard-confirm-dialog-1280-light.png', {
    fullPage: true,
    animations: 'disabled',
    timeout: 15_000,
  })

  await dialog.getByRole('button', { name: 'Отмена', exact: true }).click()
  await expect(dialog).toBeHidden()
})

test('content dialogs share one desktop interaction pattern', async ({ page }) => {
  await mockApi(page)
  await page.addInitScript(() => {
    localStorage.setItem('tg-analyzer-theme', 'light')
    localStorage.setItem('tg-analyzer-locale', 'ru')
  })
  await page.setViewportSize({ width: 390, height: 844 })

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await expect(page.locator('.dialog-item').first()).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Alex', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page).toHaveScreenshot('dashboard-account-dialog-390-light.png', {
    animations: 'disabled',
  })
  await page.getByRole('dialog').getByRole('button', { name: 'Закрыть' }).click()

  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/history', { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await expect(page.locator('.history-open').first()).toBeVisible({ timeout: 30_000 })
  await page.locator('.history-open').first().click()
  const historyDialog = page.getByRole('dialog')
  await expect(historyDialog).toBeVisible()
  await expect(historyDialog.getByRole('link', { name: 'Открыть отчёт', exact: true })).toHaveAttribute(
    'href',
    '/chat/101',
  )
  await expect(page).toHaveScreenshot('history-details-dialog-1280-light.png', {
    fullPage: true,
    animations: 'disabled',
  })
  await page.getByRole('dialog').getByRole('button', { name: 'Закрыть' }).click()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/chat/102', { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await expect(page.locator('.balance-donut')).toBeVisible({ timeout: 30_000 })
  await page.locator('.chart-card').first().click()
  const chartDialog = page.getByRole('dialog', { name: 'Развернуть график' })
  await expect(chartDialog).toBeVisible()
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
  await expect(page).toHaveScreenshot('chat-chart-dialog-390-light.png', {
    animations: 'disabled',
  })
})

test('mobile share actions use the standard dialog and buttons', async ({ page }) => {
  await mockApi(page)
  await page.addInitScript(() => {
    localStorage.setItem('tg-analyzer-theme', 'dark')
    localStorage.setItem('tg-analyzer-locale', 'ru')
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/chat/102', { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await expect(page.locator('.balance-donut')).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Поделиться' }).click()
  await expect(page.getByRole('dialog', { name: /Поделиться/ })).toBeVisible()
  await expect(page).toHaveScreenshot('chat-share-dialog-390-dark.png', {
    animations: 'disabled',
  })
})

test('mobile report topbar stays pinned while content scrolls', async ({ page }) => {
  await mockApi(page)
  await page.addInitScript(() => {
    localStorage.setItem('tg-analyzer-theme', 'light')
    localStorage.setItem('tg-analyzer-locale', 'ru')
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/chat/102', { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await expect(page.locator('.balance-donut')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.topbar')).toBeHidden()
  await expect(page.locator('#mobile-report-toolbar .report-topline')).toBeVisible()
  await expect(page.locator('.report-header .report-topline')).toHaveCount(0)

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(300)
  await expect
    .poll(() =>
      page.locator('#mobile-report-toolbar').evaluate((element) => Math.round(element.getBoundingClientRect().top)),
    )
    .toBe(0)
  await expect(page).toHaveScreenshot('chat-102-mobile-sticky-topbar-390-light.png', {
    animations: 'disabled',
    timeout: 15_000,
  })
})

test('group overview has one indicators card and fits mobile width', async ({ page }) => {
  await mockApi(page)
  await page.addInitScript(() => {
    localStorage.setItem('tg-analyzer-theme', 'light')
    localStorage.setItem('tg-analyzer-locale', 'ru')
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/chat/101', { waitUntil: 'domcontentloaded', timeout: 30_000 })

  await expect(page.getByRole('heading', { name: 'Показатели группы' })).toHaveCount(1)
  await expect(page.locator('.group-kpi-grid .metric')).toHaveCount(4)
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await expect(page).toHaveScreenshot('chat-101-overview-390-light.png', {
    fullPage: true,
    animations: 'disabled',
  })

  const contentTab = page.getByRole('tab', { name: 'Контент' })
  await contentTab.click()
  await expect(contentTab).toHaveAttribute('aria-selected', 'true')

  const dynamicsTab = page.getByRole('tab', { name: 'Динамика' })
  await dynamicsTab.click()
  await expect(page.locator('.chart.chart-lg')).toHaveCount(2)
})

test('avatars are fetched only when a dialog explicitly declares one', async ({ page }) => {
  let chatAvatarRequests = 0
  let profileAvatarRequests = 0
  await mockApi(page)
  await page.route('**/api/v1/parse/dialogs/*/avatar', async (route) => {
    chatAvatarRequests += 1
    await route.fulfill({ status: 404 })
  })
  await page.route('**/api/v1/auth/avatar', async (route) => {
    profileAvatarRequests += 1
    await route.fulfill({ status: 404 })
  })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/dashboard')
  await expect(page.locator('.dialog-item').first()).toBeVisible()
  expect(chatAvatarRequests).toBe(0)
  await page.getByRole('button', { name: 'Alex', exact: true }).click()
  await expect(page.getByRole('menu', { name: 'Alex' })).toBeVisible()
  expect(profileAvatarRequests).toBeLessThanOrEqual(1)
})

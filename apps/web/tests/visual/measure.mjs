// Measures the visual vocabulary actually rendered on each screen: button looks, surfaces, text styles,
// radii, spacing. From the repo root, against a running stack in TELEGRAM_MODE=fake:
//   node apps/web/tests/visual/measure.mjs <base-url> <out-dir> <desktop|mobile>
//   node apps/web/tests/visual/summarize.mjs <out-dir> [--check]
import { chromium, devices } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

const BASE = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/$/, '')
const OUT = process.argv[3] || '.'
const mode = process.argv[4] || 'desktop'
const iphone = { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }
delete iphone.defaultBrowserType // Chromium here, WebKit is not installed everywhere
const ctxOpts = mode === 'mobile' ? iphone : { viewport: { width: 1440, height: 900 } }

const collect = () => {
  const px = (v) =>
    v
      .split(' ')
      .map((x) => Math.round(parseFloat(x) || 0))
      .join('/')
  const vis = (el) => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return (
      r.width > 4 &&
      r.height > 4 &&
      cs.visibility !== 'hidden' &&
      cs.display !== 'none' &&
      parseFloat(cs.opacity) > 0.05
    )
  }
  const out = { buttons: [], surfaces: [], text: [], radii: [], spacing: [] }
  const all = [...document.querySelectorAll('#__nuxt *, #teleports *')].filter(vis)
  for (const el of all) {
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    // A control drawn as part of a text field (the country code before a phone number) is the field, not a button look.
    const isBtn =
      el.matches('button, a.btn, [role=button], a[class*="btn"], .chip, [role=tab], [role=switch]') &&
      !el.matches('.select__addon')
    const bg = cs.backgroundColor
    const hasBg = bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent'
    const rad = px(cs.borderRadius)
    if (cs.borderRadius !== '0px') out.radii.push(rad)
    if (isBtn) {
      out.buttons.push({
        sig: `h${Math.round(r.height)} r${rad} bg:${bg} bd:${cs.borderTopWidth} ${cs.borderTopColor} fs${cs.fontSize}/${cs.fontWeight} c:${cs.color}`,
        cls: (el.className?.baseVal ?? el.className ?? '').toString().split(' ').slice(0, 3).join('.'),
        label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30),
      })
    } else if (hasBg && cs.borderRadius !== '0px' && r.width > 120 && r.height > 48) {
      out.surfaces.push({
        sig: `r${rad} pad${px(cs.padding)} bg:${bg} sh:${cs.boxShadow === 'none' ? '-' : 'y'}`,
        cls: (el.className?.baseVal ?? el.className ?? '').toString().split(' ').slice(0, 2).join('.'),
        w: Math.round(r.width),
      })
    }
    // The wordmark is part of the logo (a picture), not a text style of the interface.
    const ownText =
      !el.matches('.brand-wordmark') &&
      [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1)
    if (ownText) {
      out.text.push({
        sig: `${cs.fontSize}/${cs.lineHeight} w${cs.fontWeight}`,
        color: cs.color,
        tag: el.tagName.toLowerCase(),
        sample: [...el.childNodes]
          .filter((n) => n.nodeType === 3)
          .map((n) => n.textContent.trim())
          .join(' ')
          .slice(0, 30),
      })
    }
    for (const k of ['paddingTop', 'paddingLeft', 'rowGap', 'columnGap', 'marginTop', 'marginBottom']) {
      const v = Math.round(parseFloat(cs[k]) || 0)
      if (v > 0) out.spacing.push(v)
    }
  }
  return out
}

const b = await chromium.launch()
const c = await b.newContext({ ...ctxOpts, colorScheme: 'light', locale: 'ru-RU' })
await c.addCookies([
  { name: 'tg-analyzer-theme', value: 'light', url: BASE },
  { name: 'tg-analyzer-locale', value: 'ru', url: BASE },
])
const p = await c.newPage()
const ready = async () => {
  await p.waitForFunction(() => Boolean(document.querySelector('#__nuxt')?.__vue_app__), null, { timeout: 60000 })
  await p.waitForLoadState('networkidle').catch(() => {})
  await p.waitForTimeout(1500)
}
const screens = {}
const grab = async (name) => {
  screens[name] = await p.evaluate(collect)
  console.log('grabbed', name)
}

await p.goto(BASE + '/')
await ready()
await grab('landing')
await p.goto(BASE + '/privacy')
await ready()
await grab('privacy')
await p.goto(BASE + '/example')
await ready()
await grab('example')
await p.goto(BASE + '/login')
await ready()
await grab('login')
const phone = `900${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`.replace(/9$/, '1')
await p.locator('.phone-input').fill(phone)
await p.getByRole('button', { name: 'Получить код' }).click()
await p.locator('.otp-input').first().click()
await p.keyboard.type('12345')
// The code sends itself after the last digit; the button is only a fallback.
const enter = p.getByRole('button', { name: 'Войти', exact: true })
if (await enter.isEnabled().catch(() => false)) await enter.click().catch(() => {})
await p.waitForURL('**/dashboard')
await ready()
await grab('home-first')
await p.goto(BASE + '/new')
await ready()
await grab('new')
for (const [title, id] of [
  ['Мила', '1011'],
  ['Продуктовая команда', '-1002001'],
]) {
  await p.goto(BASE + '/new')
  await ready()
  const b = p
    .locator('.chat-row')
    .filter({ hasText: title })
    .first()
    .getByRole('button', { name: /^Разобрать/ })
  if (await b.count()) {
    await b.first().click()
    await p
      .waitForFunction((cid) => location.pathname.endsWith(`/chat/${cid}`) || document.querySelector('.toast'), id, {
        timeout: 90000,
      })
      .catch(() => {})
    await p.waitForTimeout(1500)
  }
}
await p.goto(BASE + '/dashboard')
await ready()
await grab('home')
await p.goto(BASE + '/chat/1011')
await ready()
await grab('report')
// count report blocks
const blocks = await p.evaluate(() => {
  const parts = [...document.querySelectorAll('.report-part')].map((part) => ({
    h: part.querySelector('h2')?.textContent?.trim(),
    lede: part.querySelector('h2')?.parentElement?.querySelector('p')?.textContent?.trim(),
    cards: [...part.querySelectorAll('article, section.report-section, .report-section')].map((a) => ({
      q: a.querySelector('h3, .report-section__question, p')?.textContent?.trim()?.slice(0, 40),
      a: a.querySelector('.report-section__answer, h3')?.textContent?.trim()?.slice(0, 60),
    })),
  }))
  return {
    parts,
    height: document.documentElement.scrollHeight,
    words: document.querySelector('main')?.innerText.split(/\s+/).length,
  }
})
await p.goto(BASE + '/chat/-1002001')
await ready()
await grab('group')
const gblocks = await p.evaluate(() => ({
  height: document.documentElement.scrollHeight,
  words: document.querySelector('main')?.innerText.split(/\s+/).length,
}))
await p.goto(BASE + '/chat/1011')
await ready()
await p.evaluate(() => {
  const v = [...document.querySelectorAll('button')]
    .filter((b) => (b.getAttribute('aria-label') || b.textContent || '').trim() === 'Поделиться')
    .find((b) => b.getBoundingClientRect().width > 0)
  v?.click()
})
await p.getByRole('dialog').waitFor()
await p.waitForTimeout(800)
await grab('share')
await p.keyboard.press('Escape')
await p.goto(BASE + '/account')
await ready()
await grab('account')
await writeFile(`${OUT}/audit-${mode}.json`, JSON.stringify({ screens, blocks, gblocks }, null, 1))
await b.close()

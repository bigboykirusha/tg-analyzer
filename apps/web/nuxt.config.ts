function originOf(value: string | undefined) {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

/**
 * Browser HTTP traffic always goes through this app's own `/api` proxy
 * (server/routes/api) so the refresh cookie stays first-party.
 */
const apiProxyTarget = (process.env.NUXT_API_PROXY_TARGET || 'http://localhost:3001').replace(/\/$/, '')
// Nitro's proxy does not upgrade WebSockets, so the socket connects to the API directly.
// Set NUXT_PUBLIC_WS_URL at build time (it also feeds the CSP); locally it defaults to the API.
const wsUrl = (
  process.env.NUXT_PUBLIC_WS_URL || (process.env.NODE_ENV === 'production' ? '' : apiProxyTarget.replace(/^http/, 'ws'))
).replace(/\/$/, '')
// Canonical, og:image and sitemap links need an absolute address: the production image is built with
// NUXT_PUBLIC_SITE_URL (https://SITE_HOST, deploy/docker-compose.yml); locally it is the dev server.
const siteUrl = (process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

const securityHeaders = {
  'content-security-policy': [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${originOf(wsUrl) ?? ''}`.trim(),
    "worker-src 'self' blob:",
  ].join('; '),
  'permissions-policy': 'camera=(), geolocation=(), microphone=()',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
}

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  srcDir: 'app',
  spaLoadingTemplate: 'spa-loading-template.html',
  devtools: { enabled: process.env.NUXT_DEVTOOLS === 'true' },
  modules: ['@pinia/nuxt'],
  // UI kit components are prefixed (`UiButton`); feature components use their file name.
  components: [
    { path: '~/components/ui', prefix: 'Ui' },
    { path: '~/components', pathPrefix: false },
  ],
  css: [
    // Self-hosted variable fonts; unicode-range keeps downloads to the scripts a page uses.
    // Onest: one Cyrillic-first variable family for the whole product.
    '@fontsource-variable/onest/index.css',
    '~/assets/styles/tokens.css',
    '~/assets/styles/base.css',
    '~/assets/styles/report.css',
  ],
  app: {
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#f4f4f5', tagPriority: -9 },
      ],
      link: [{ rel: 'manifest', href: '/manifest.webmanifest' }],
      // CSR shells have no server theme attribute: preserve the explicit cookie
      // or use the system preference before the first paint and app hydration.
      script: [
        {
          innerHTML:
            "(function(){var d=document.documentElement;var p=document.cookie.match(/(?:^|; *)tg-analyzer-theme=(light|dark)(?:;|$)/);d.dataset.theme=d.dataset.theme||(p?p[1]:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');var m=document.querySelector('meta[name=theme-color]');if(m)m.content=d.dataset.theme==='dark'?'#0e0e10':'#f4f4f5'})()",
          tagPosition: 'head',
          tagPriority: 'critical',
        },
      ],
    },
  },
  // One list of route rules. Keeping a second list under `nitro.routeRules` made the
  // build drop `ssr: false` for the same paths, and the signed-in pages rendered on
  // the server and failed with a 500 on reload.
  routeRules: {
    '/**': { headers: securityHeaders },
    // Signed-in screens restore the session in the browser (the refresh cookie is
    // HttpOnly and only the API can read it), so they render on the client only.
    // They never reach a crawler as HTML, so noindex goes in a header.
    '/dashboard': { ssr: false, headers: { 'x-robots-tag': 'noindex, nofollow' } },
    '/new': { ssr: false, headers: { 'x-robots-tag': 'noindex, nofollow' } },
    '/notifications': { ssr: false, headers: { 'x-robots-tag': 'noindex, nofollow' } },
    '/account': { ssr: false, headers: { 'x-robots-tag': 'noindex, nofollow' } },
    // Built in the browser from a made-up chat; nothing to render on the server.
    '/example': { ssr: false },
    // «Мои люди» was removed; old links land on the chats list.
    '/people': { redirect: '/dashboard' },
    // The job log page was removed; old links land on the chats list.
    '/history': { redirect: '/dashboard' },
    '/chat/**': { ssr: false, headers: { 'x-robots-tag': 'noindex, nofollow' } },
    // The bot's «Открыть» lands here with a Telegram signature in the address: client only, never indexed.
    '/auth/**': { ssr: false, headers: { 'x-robots-tag': 'noindex, nofollow' } },
    // Shared reports and quizzes: private by nature, fetched in the browser, never indexed. The shell renders on the
    // server so a messenger reads the link's preview (og:image — the person's poster from the API).
    '/s/**': { headers: { 'x-robots-tag': 'noindex, nofollow' } },
  },
  // Bundle the icons with the app: left external on the server, @lucide/vue reached a
  // second copy of Vue, lost its injection context and the first render after a cold
  // start failed with a 500 («Cannot destructure property 'size' of useLucideProps()»).
  build: { transpile: ['@lucide/vue'] },
  runtimeConfig: {
    // Overridden at runtime by NUXT_API_PROXY_TARGET.
    apiProxyTarget,
    // The footer's «Канал» and «Поддержать»: each shows only when set (NUXT_PUBLIC_CHANNEL_URL,
    // NUXT_PUBLIC_SUPPORT_URL, read at runtime).
    public: { wsUrl, siteUrl, channelUrl: '', supportUrl: '' },
  },
  typescript: { strict: true },
})

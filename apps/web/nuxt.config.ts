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
const siteUrl = process.env.NUXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

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
  devtools: { enabled: process.env.NUXT_DEVTOOLS === 'true' },
  modules: ['@pinia/nuxt'],
  // UI kit components are prefixed (`UiButton`); feature components use their file name.
  components: [
    { path: '~/components/ui', prefix: 'Ui' },
    { path: '~/components', pathPrefix: false },
  ],
  css: [
    // Self-hosted variable fonts; unicode-range keeps downloads to the scripts a page uses.
    '@fontsource-variable/onest/index.css',
    '@fontsource-variable/literata/opsz.css',
    '@fontsource-variable/literata/opsz-italic.css',
    '~/assets/styles/tokens.css',
    '~/assets/styles/base.css',
  ],
  app: {
    head: {
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }],
      link: [{ rel: 'manifest', href: '/manifest.webmanifest' }],
    },
  },
  // Signed-in screens restore the session in the browser (the refresh cookie is
  // HttpOnly and only the API can read it), so they render on the client only.
  routeRules: {
    '/dashboard': { ssr: false },
    '/account': { ssr: false },
    // Built in the browser from a made-up chat; nothing to render on the server.
    '/example': { ssr: false },
    // «Мои люди» was removed; old links land on the chats list.
    '/people': { redirect: '/dashboard' },
    // The job log page was removed; old links land on the chats list.
    '/history': { redirect: '/dashboard' },
    '/chat/**': { ssr: false },
    // The policy is a modal on the login page now.
    '/privacy': { redirect: '/login#privacy' },
  },
  runtimeConfig: {
    // Overridden at runtime by NUXT_API_PROXY_TARGET.
    apiProxyTarget,
    public: { wsUrl, siteUrl },
  },
  nitro: {
    routeRules: {
      '/**': { headers: securityHeaders },
    },
  },
  typescript: { strict: true },
})

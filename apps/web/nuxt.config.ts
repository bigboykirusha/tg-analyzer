function tryGetOrigin(value: string | undefined) {
  if (!value) {
    return null
  }
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

const publicApiUrl = process.env.NUXT_PUBLIC_API_URL ?? ''
const publicWsUrl = process.env.NUXT_PUBLIC_WS_URL ?? ''
const siteUrl = process.env.NUXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const apiProxyTarget = process.env.NUXT_API_PROXY_TARGET ?? 'http://localhost:3001'
const wsProxyTarget = process.env.NUXT_WS_PROXY_TARGET ?? 'ws://localhost:3001'
const wsDirectFallbackUrl = process.env.NUXT_PUBLIC_WS_DIRECT_URL ?? wsProxyTarget

const publicApiOrigin = tryGetOrigin(publicApiUrl)
const publicWsOrigin = tryGetOrigin(publicWsUrl)
const wsDirectOrigin = tryGetOrigin(wsDirectFallbackUrl)
const connectSrcOrigins = [publicApiOrigin, publicWsOrigin, wsDirectOrigin].filter(Boolean).join(' ')
const webSecurityHeaders = {
  'content-security-policy': [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "script-src 'self' 'unsafe-inline'",
    `connect-src 'self' ${connectSrcOrigins}`.trim(),
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
  css: ['~/assets/main.css', '~/assets/css/animations.css'],
  app: {
    head: {
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1, viewport-fit=cover',
        },
      ],
      link: [{ rel: 'manifest', href: '/manifest.webmanifest' }],
    },
  },
  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss'],
  routeRules: {
    // Authenticated screens are client-only: the refresh cookie is owned by the
    // API and cannot be restored during SSR on split-origin deployments.
    // Rendering their shell on the server caused route hydration mismatches
    // whenever the client middleware had to restore or reject a session.
    '/dashboard': { ssr: false },
    '/history': { ssr: false },
    '/chat/**': { ssr: false },
  },
  hooks: {
    'pages:extend'(pages) {
      if (process.env.NODE_ENV === 'production') {
        const index = pages.findIndex((page) => page.path === '/design')
        if (index >= 0) pages.splice(index, 1)
      }
    },
  },
  runtimeConfig: {
    public: {
      apiUrl: publicApiUrl,
      wsUrl: publicWsUrl,
      wsDirectFallbackUrl,
      siteUrl,
    },
  },
  nitro: {
    routeRules: {
      '/**': {
        headers: webSecurityHeaders,
      },
      '/api/**': {
        proxy: `${apiProxyTarget}/api/**`,
      },
      '/ws/**': {
        proxy: `${wsProxyTarget}/ws/**`,
      },
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
})

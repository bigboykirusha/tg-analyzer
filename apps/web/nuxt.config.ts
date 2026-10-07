function requiredOrigin(value: string, variableName: string) {
  try {
    return new URL(value).origin
  } catch {
    throw new Error(`${variableName} must be an absolute URL`)
  }
}

const apiUrl = process.env.NUXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const wsUrl = process.env.NUXT_PUBLIC_WS_URL ?? 'ws://localhost:3001'
const siteUrl = process.env.NUXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
const apiOrigin = requiredOrigin(apiUrl, 'NUXT_PUBLIC_API_URL')
const wsOrigin = requiredOrigin(wsUrl, 'NUXT_PUBLIC_WS_URL')
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
    `connect-src 'self' ${apiOrigin} ${wsOrigin}`,
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
          content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
        },
      ],
      link: [
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&family=DM+Mono:wght@400;500&display=swap',
        },
      ],
    },
  },
  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss'],
  runtimeConfig: {
    public: {
      apiUrl,
      wsUrl,
      siteUrl,
    },
  },
  nitro: {
    routeRules: {
      '/**': {
        headers: webSecurityHeaders,
      },
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
})

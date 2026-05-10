export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  srcDir: 'app',
  devtools: { enabled: process.env.NUXT_DEVTOOLS === 'true' },
  css: ['~/assets/main.css', '~/assets/css/animations.css'],
  app: {
    head: {
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
      apiUrl: process.env.NUXT_PUBLIC_API_URL ?? 'http://localhost:3001',
      wsUrl: process.env.NUXT_PUBLIC_WS_URL ?? 'ws://localhost:3001',
    },
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
})

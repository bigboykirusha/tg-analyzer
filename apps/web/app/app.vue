<script setup lang="ts">
const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const { locale } = useI18n()
const { hydrate: hydrateTheme } = useTheme()

const siteUrl = computed(() => String(runtimeConfig.public.siteUrl ?? '').replace(/\/$/, ''))
const currentUrl = computed(() => `${siteUrl.value}${route.fullPath || '/'}`)
const ogImageUrl = computed(() => `${siteUrl.value}/og-image.svg`)
const defaultDescription = computed(() =>
  locale.value === 'ru'
    ? 'TG Analyzer помогает анализировать Telegram-чаты: ритм, активность, баланс диалога, слова, эмодзи и динамику общения.'
    : 'TG Analyzer helps you analyze Telegram chats through focused reports on rhythm, activity, balance, vocabulary, emoji usage, and conversation dynamics.',
)

useHead({
  htmlAttrs: {
    lang: () => locale.value,
  },
  titleTemplate: (titleChunk) => (titleChunk ? `${titleChunk} - TG Analyzer` : 'TG Analyzer'),
  link: [
    { rel: 'canonical', href: () => currentUrl.value },
    { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' },
    { rel: 'shortcut icon', href: '/logo.svg' },
    { rel: 'apple-touch-icon', href: '/logo.svg' },
    { rel: 'alternate', hreflang: 'ru', href: () => currentUrl.value },
    { rel: 'alternate', hreflang: 'en', href: () => currentUrl.value },
    { rel: 'alternate', hreflang: 'x-default', href: () => currentUrl.value },
  ],
  meta: [
    { charset: 'utf-8' },
    { name: 'theme-color', content: '#11131c', media: '(prefers-color-scheme: dark)' },
    { name: 'theme-color', content: '#f6f7fc', media: '(prefers-color-scheme: light)' },
    { name: 'apple-mobile-web-app-title', content: 'TG Analyzer' },
    { name: 'format-detection', content: 'telephone=no' },
  ],
})

onMounted(hydrateTheme)

useSeoMeta({
  description: () => defaultDescription.value,
  robots: 'index, follow',
  author: 'TG Analyzer',
  applicationName: 'TG Analyzer',
  ogType: 'website',
  ogSiteName: 'TG Analyzer',
  ogLocale: () => (locale.value === 'ru' ? 'ru_RU' : 'en_US'),
  ogUrl: () => currentUrl.value,
  ogImage: () => ogImageUrl.value,
  twitterCard: 'summary_large_image',
  twitterImage: () => ogImageUrl.value,
})
</script>

<template>
  <NuxtPage />
  <UiToastProvider />
</template>

<script setup lang="ts">
const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const { locale, t } = useI18n()
useTheme().install()

const siteUrl = computed(() => String(runtimeConfig.public.siteUrl ?? '').replace(/\/$/, ''))
const pageUrl = computed(() => `${siteUrl.value}${route.path}`)

useHead({
  htmlAttrs: { lang: () => locale.value },
  titleTemplate: (title) => (title ? `${title} · TG Analyzer` : 'TG Analyzer'),
  link: [
    { rel: 'canonical', href: () => pageUrl.value },
    { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' },
    { rel: 'apple-touch-icon', href: '/logo.svg' },
  ],
  meta: [
    { charset: 'utf-8' },
    { name: 'theme-color', content: '#0B0B0C', media: '(prefers-color-scheme: dark)' },
    { name: 'theme-color', content: '#F5F5F7', media: '(prefers-color-scheme: light)' },
    { name: 'format-detection', content: 'telephone=no' },
  ],
})

useSeoMeta({
  description: () => t('seo.description'),
  ogType: 'website',
  ogSiteName: 'TG Analyzer',
  ogLocale: () => (locale.value === 'ru' ? 'ru_RU' : 'en_US'),
  ogUrl: () => pageUrl.value,
  ogImage: () => `${siteUrl.value}/og-image.svg`,
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <UiToastProvider />
</template>

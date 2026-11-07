<script setup lang="ts">
const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const { locale, t } = useI18n()
const theme = useTheme()
theme.install()
const auth = useAuthStore()
const workspace = useWorkspaceStore()
const analysis = useAnalysis()
watch(
  () => auth.user?.id,
  (userId, previousId) => {
    if (previousId && userId !== previousId) {
      analysis.stop()
      workspace.reset()
    }
  },
  { flush: 'sync' },
)
// Visit analytics: add a self-hosted Plausible or Umami script here (see docs/ROADMAP.md); no Yandex Metrica.

const siteUrl = computed(() => String(runtimeConfig.public.siteUrl ?? '').replace(/\/$/, ''))
const pageUrl = computed(() => `${siteUrl.value}${route.path}`)

useHead({
  htmlAttrs: { lang: () => locale.value },
  titleTemplate: (title) => (title ? `${title} · TG Analyzer` : 'TG Analyzer'),
  link: [
    { rel: 'canonical', href: () => pageUrl.value },
    { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
  ],
  meta: [
    { charset: 'utf-8' },
    {
      name: 'theme-color',
      tagPriority: -9,
      content: () => (theme.resolved.value === 'dark' ? '#000000' : '#f2f2f5'),
    },
    { name: 'format-detection', content: 'telephone=no' },
  ],
})

useSeoMeta({
  description: () => t('seo.description'),
  ogType: 'website',
  ogSiteName: 'TG Analyzer',
  ogLocale: () => (locale.value === 'ru' ? 'ru_RU' : 'en_US'),
  ogUrl: () => pageUrl.value,
  ogImage: () => `${siteUrl.value}/og-image.png`,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <NuxtLoadingIndicator color="var(--them)" :height="2" :throttle="200" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ClientOnly>
    <UiToastProvider />
  </ClientOnly>
</template>

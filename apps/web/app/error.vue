<script setup lang="ts">
const props = defineProps<{ error: { statusCode?: number; statusMessage?: string; message?: string } }>()
const { t, locale } = useI18n()
const notFound = computed(() => props.error.statusCode === 404)
useSeoMeta({ robots: 'noindex' })
// app.vue is not rendered on the error page, so the language and title are set here.
useHead({
  htmlAttrs: { lang: () => locale.value },
  title: () => (notFound.value ? t('error.notFoundTitle') : t('error.title')),
})

function retry() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <NuxtLayout>
    <StatusPage
      :code="`${t('error.code')} ${error.statusCode || 500}`"
      :title="notFound ? t('error.notFoundTitle') : t('error.title')"
      :text="notFound ? t('error.notFoundText') : t('error.text')"
      :action="t('error.backHome')"
      @action="retry"
    />
  </NuxtLayout>
</template>

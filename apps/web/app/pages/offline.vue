<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()

function retry() {
  const target = route.query.redirect
  const path = typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : '/dashboard'
  return navigateTo(path, { replace: true })
}
</script>

<template>
  <StatusPage
    :title="t('offline.title')"
    :text="t('offline.text')"
    :action="t('offline.retry')"
    @action="retry"
  />
</template>

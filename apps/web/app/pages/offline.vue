<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()

/** The browser is online, yet the service did not answer: the problem is ours, not the person's internet. */
// The server cannot know: both render «no connection» first, the browser's answer follows on mount.
const online = ref(false)
const update = () => (online.value = navigator.onLine)
onMounted(() => {
  update()
  window.addEventListener('online', update)
  window.addEventListener('offline', update)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', update)
  window.removeEventListener('offline', update)
})
const title = computed(() => (online.value ? t('offline.serverTitle') : t('offline.title')))
const text = computed(() => (online.value ? t('offline.serverText') : t('offline.text')))

function retry() {
  const target = route.query.redirect
  const path = typeof target === 'string' && target.startsWith('/') && !target.startsWith('//') ? target : '/dashboard'
  return navigateTo(path, { replace: true })
}
</script>

<template>
  <StatusPage :title="title" :text="text" :action="t('offline.retry')" @action="retry" />
</template>

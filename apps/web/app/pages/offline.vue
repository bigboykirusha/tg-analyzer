<script setup lang="ts">
const { t } = useI18n()

function retry() {
  if (import.meta.client) {
    window.location.reload()
  }
}
</script>

<template>
  <StatusPage
    :code="t('offline.code')"
    :title="t('offline.title')"
    :text="t('offline.text')"
    :action="t('offline.retry')"
    @action="retry"
  />
</template>

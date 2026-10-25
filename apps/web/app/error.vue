<script setup lang="ts">
const props = defineProps<{ error: { statusCode?: number; statusMessage?: string; message?: string } }>()
const { t } = useI18n()
const notFound = computed(() => props.error.statusCode === 404)

function retry() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <StatusPage
    :code="`${t('error.code')} ${error.statusCode || 500}`"
    :title="notFound ? t('error.notFoundTitle') : t('error.title')"
    :text="notFound ? t('error.notFoundText') : t('error.text')"
    :action="t('error.backHome')"
    @action="retry"
  />
</template>

<script setup lang="ts">
/** «Новый анализ»: the whole Telegram list with search on its own page (desktop and direct links). */
definePageMeta({ layout: 'workspace', middleware: ['auth'] })

const { t } = useI18n()
useSeoMeta({ title: () => t('newAnalysis.seoTitle') })
</script>

<template>
  <UiPageContainer>
    <div class="new">
      <UiPageBar :title="t('newAnalysis.title')" :lede="t('newAnalysis.lede')" back="/dashboard" />
      <ChatPicker sticky />
    </div>
  </UiPageContainer>
</template>

<style scoped>
.new {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding-bottom: var(--page-bottom);
}
</style>

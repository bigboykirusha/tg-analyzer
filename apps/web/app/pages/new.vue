<script setup lang="ts">
/** Picking a chat to analyse: the whole Telegram list with search on its own page. */
definePageMeta({ layout: 'workspace', middleware: ['auth'] })

const { t } = useI18n()
useSeoMeta({ title: () => t('newAnalysis.seoTitle') })
</script>

<template>
  <UiPageContainer>
    <div class="page new-analysis">
      <UiPageBar :title="t('newAnalysis.title')" :lede="t('newAnalysis.lede')" back="/dashboard" />
      <SessionBanner />
      <AnalysisBanner />
      <ChatPicker sticky />
    </div>
  </UiPageContainer>
</template>

<style scoped>
/* The list belongs to the title: a tighter step than between sections. */
.new-analysis {
  gap: var(--space-6);
}
</style>

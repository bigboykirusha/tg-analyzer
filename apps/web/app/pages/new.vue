<script setup lang="ts">
/** The stand-alone chat picker shares the reading column with account and notifications. */
definePageMeta({ layout: 'workspace', middleware: ['auth'] })

const { t } = useI18n()
useSeoMeta({ title: () => t('newAnalysis.seoTitle') })
</script>

<template>
  <UiPageContainer size="narrow">
    <div class="new">
      <UiPageBar :title="t('newAnalysis.title')" back="/dashboard" />
      <ChatPicker standalone />
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

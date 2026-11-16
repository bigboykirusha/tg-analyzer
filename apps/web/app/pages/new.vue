<script setup lang="ts">
/** «Новый анализ»: the whole Telegram list with search on its own page (the sidebar's button, «Разобрать чат» on a phone), in the same
 * reading column as the other lists (account, notifications): a name and its «Разобрать» stay within one glance. */
definePageMeta({ layout: 'workspace', middleware: ['auth'] })

const { t } = useI18n()
useSeoMeta({ title: () => t('newAnalysis.seoTitle') })

/**
 * On a phone the running analysis lives in the bar at the bottom of home (HomeActionBar), so a started one goes back
 * there to be watched; a start that failed (a limit, a small chat) stays here with its message. A computer stays: the
 * analysis grows as a tile on home and in the sidebar's reach.
 */
const narrow = useMediaQuery('(max-width: 900px)')
const actions = useReportActions()
watch(actions.starting, (now, before) => {
  if (narrow.value && before && !now && actions.busy(before)) void navigateTo('/dashboard')
})
</script>

<template>
  <UiPageContainer size="narrow">
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

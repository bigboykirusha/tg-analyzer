<script setup lang="ts">
// Signed-in screens are personal: keep them out of search.
useSeoMeta({ robots: 'noindex, nofollow' })
const analysis = useAnalysis()
const workspace = useWorkspaceStore()
const { syncTimeZone } = useAuth()
const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const isReport = computed(() => route.path.startsWith('/chat/'))

onMounted(() => {
  if (!workspace.reports.length) void workspace.loadReports().catch(() => undefined)
})

onMounted(() => {
  analysis.start()
  void syncTimeZone().catch(() => undefined)
})

// Announce finished analyses wherever the user is, and refresh the report list.
watch(analysis.finished, (job) => {
  if (!job) return
  const chat = job.chatTitle || t('analysis.untitledChat')
  const chatId = job.chatId
  if (job.status === 'completed')
    toast.success(
      t('analysis.done.title'),
      t('analysis.done.text', { chat }),
      chatId ? { label: t('dashboard.openReport'), onClick: () => void navigateTo(`/chat/${chatId}`) } : undefined,
    )
  else if (job.status === 'failed')
    toast.error(t('analysis.failed.title'), t(`analysis.error.${job.error ?? 'internal'}`))
  else if (job.status === 'cancelled') toast.info(t('analysis.cancelled'))
  void workspace.loadReports().catch(() => undefined)
})
</script>

<template>
  <div class="workspace">
    <div class="workspace-sidebar"><AppSidebar /></div>
    <div class="workspace-column">
      <AppHeader />
      <main class="workspace-main">
        <UiPageContainer v-if="isReport" class="workspace-chips">
          <ReportChips />
        </UiPageContainer>
        <slot />
      </main>
    </div>
    <BottomTabs />
  </div>
</template>

<style scoped>
/* Wide screens: the chat list on the left, the page on the right. Phones: one column. */
.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: 100dvh;
}

.workspace-sidebar,
.workspace-chips {
  display: none;
}

.workspace-column {
  min-width: 0;
}

.workspace-main {
  min-width: 0;
  padding: var(--space-6) 0 var(--space-16);
}

@media (min-width: 901px) {
  .workspace {
    grid-template-columns: 248px minmax(0, 1fr);
  }

  /* The rail runs the full page height; the list inside stays pinned. */
  .workspace-sidebar {
    display: block;
    border-right: 1px solid var(--border);
    background: var(--sidebar);
  }
}

@media (max-width: 900px) {
  .workspace-chips {
    display: block;
    margin-bottom: var(--space-4);
  }

  /* Room for the tab bar. */
  .workspace-main {
    padding-bottom: calc(var(--space-16) + 64px + env(safe-area-inset-bottom, 0px));
  }
}

@media (max-width: 640px) {
  .workspace-main {
    padding-top: var(--space-2);
  }
}
</style>

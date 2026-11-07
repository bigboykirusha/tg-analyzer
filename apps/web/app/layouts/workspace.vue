<script setup lang="ts">
// Signed-in screens are personal: keep them out of search.
useSeoMeta({ robots: 'noindex, nofollow' })
const analysis = useAnalysis()
const workspace = useWorkspaceStore()
const { syncTimeZone } = useAuth()
const { t } = useI18n()
const toast = useToast()
const route = useRoute()

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
  // The very first report opens by itself: that is what the newcomer was waiting for.
  const opened = job.status === 'completed' && chatId && !workspace.reports.length && route.path === '/dashboard'
  if (opened) void navigateTo(`/chat/${chatId}`)
  if (job.status === 'completed')
    toast.success(
      t('analysis.done.title'),
      t('analysis.done.text', { chat }),
      chatId && !opened
        ? { label: t('dashboard.openReport'), onClick: () => void navigateTo(`/chat/${chatId}`) }
        : undefined,
    )
  else if (job.status === 'failed')
    toast.error(t('analysis.failed.title'), t(`analysis.error.${job.error ?? 'internal'}`))
  else if (job.status === 'cancelled') toast.info(t('analysis.cancelled'))
  void workspace.loadReports().catch(() => undefined)
})
</script>

<template>
  <div class="workspace">
    <!-- Keyboard users skip the sidebar's links straight to the screen. -->
    <a class="skip-link" href="#main">{{ t('common.skipToContent') }}</a>
    <div class="workspace-sidebar"><AppSidebar /></div>
    <!-- Wide screens: the screen lies on one light panel, and its header belongs to the panel. -->
    <div class="workspace-panel">
      <AppHeader />
      <main id="main" class="workspace-main" tabindex="-1">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
/*
 * Wide screens («inset»): the menu stands at the window's edge on the grey ground, the screen lies
 * on a light rounded panel beside it, and the header lives inside that panel. Phones: one column.
 */
.workspace {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-height: 100dvh;
}

.workspace-panel {
  min-width: 0;
}

.workspace-sidebar {
  display: none;
}

.workspace-main {
  min-width: 0;
  padding: var(--page-top) 0 var(--page-bottom);
}

@media (min-width: 901px) {
  .workspace {
    grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
    background: var(--sidebar);
  }

  .workspace-sidebar {
    display: block;
  }

  .workspace-panel {
    min-height: calc(100dvh - 2 * var(--space-2));
    margin: var(--space-2) var(--space-2) var(--space-2) 0;
    border-radius: var(--radius-xl);
    background: var(--bg);
    box-shadow: 0 0 0 1px var(--border);
  }
}
</style>

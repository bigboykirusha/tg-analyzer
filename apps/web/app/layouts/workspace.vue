<script setup lang="ts">
import { MIN_REPORT_MESSAGES } from '@tg-analyzer/shared'

// Signed-in screens are personal: keep them out of search.
useSeoMeta({ robots: 'noindex, nofollow' })
const analysis = useAnalysis()
const workspace = useWorkspaceStore()
const { syncTimeZone } = useAuth()
const { t } = useI18n()
const toast = useToast()
const route = useRoute()
const notifications = useNotificationsStore()

onMounted(() => {
  if (!workspace.reports.length) void workspace.loadReports().catch(() => undefined)
  // The sidebar orders reports as home does — pinned in Telegram first — so it needs the chat list on every
  // screen, not only on home and «Новый анализ» (the cached list answers at once). Home loads it itself first.
  if (workspace.dialogsState === 'idle') void workspace.loadDialogs()
})

// The bell's dot: checked on arrival and on every screen change (a cheap count), and after an analysis.
watch(
  () => route.path,
  (path) => {
    if (path !== '/notifications') void notifications.loadUnread()
  },
  { immediate: true },
)

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
  const opened =
    job.status === 'completed' && chatId && !workspace.reports.length && ['/dashboard', '/new'].includes(route.path)
  if (opened) void navigateTo(`/chat/${chatId}`)
  if (job.status === 'completed')
    toast.success(
      t('analysis.done.title'),
      t('analysis.done.text', { chat }),
      chatId && !opened
        ? { label: t('dashboard.openReport'), onClick: () => void navigateTo(`/chat/${chatId}`) }
        : undefined,
    )
  else if (job.status === 'failed') {
    if (job.error === 'chat_too_small' && chatId) workspace.markTooSmall(chatId)
    toast.error(
      t('analysis.failed.title'),
      t(`analysis.error.${job.error ?? 'internal'}`, { min: MIN_REPORT_MESSAGES }),
    )
  } else if (job.status === 'cancelled') toast.info(t('analysis.cancelled'))
  void workspace.loadReports().catch(() => undefined)
  void notifications.loadUnread()
})
</script>

<template>
  <div class="workspace">
    <a class="skip-link" href="#main">{{ t('common.skipToContent') }}</a>
    <div class="workspace-sidebar"><AppSidebar /></div>
    <div class="workspace-panel">
      <AppHeader />
      <main id="main" class="workspace-main" tabindex="-1">
        <slot />
      </main>
    </div>
    <ChatPickerSheet />
    <ReportActionsHost />
  </div>
</template>

<style scoped>
/* Desktop: the sidebar beside one column. Phones and tablets: one column under the app bar. */
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
  }

  .workspace-sidebar {
    display: block;
  }
}
</style>

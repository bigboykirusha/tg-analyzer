<script setup lang="ts">
import { MIN_REPORT_MESSAGES } from '@tg-analyzer/shared'
import { Plus } from '../lib/icons'

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
    toast.error(
      t('analysis.failed.title'),
      t(`analysis.error.${job.error ?? 'internal'}`, { min: MIN_REPORT_MESSAGES }),
    )
  else if (job.status === 'cancelled') toast.info(t('analysis.cancelled'))
  void workspace.loadReports().catch(() => undefined)
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
    <!--
      Phones and tablets: one floating control at the bottom. On home it is «Новый анализ» (the chat list
      as a sheet); while an analysis runs, on any screen, it is the analysis folded into a capsule.
    -->
    <div v-if="analysis.isActive.value || route.path === '/dashboard'" class="workspace-dock no-print">
      <AnalysisLive v-if="analysis.isActive.value" />
      <UiButton
        v-else
        :to="{ query: { ...route.query, pick: null } }"
        variant="primary"
        size="lg"
        class="workspace-dock__new"
        :icon="Plus"
      >
        {{ t('sidebar.newAnalysis') }}
      </UiButton>
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

/* The dock floats over the content; screens leave --fab-clearance free under their last block. */
.workspace-dock {
  position: fixed;
  bottom: calc(env(safe-area-inset-bottom, 0px) + var(--space-4));
  left: 50%;
  z-index: var(--z-dock);
  display: flex;
  justify-content: center;
  width: max-content;
  max-width: calc(100% - var(--page-gutter) * 2);
  transform: translateX(-50%);
}

.workspace-dock__new {
  box-shadow: var(--shadow-float);
}

@media (min-width: 901px) {
  .workspace {
    grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
  }

  .workspace-sidebar {
    display: block;
  }

  .workspace-dock {
    display: none;
  }
}
</style>

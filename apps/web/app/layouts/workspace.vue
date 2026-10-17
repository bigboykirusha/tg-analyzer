<script setup lang="ts">
const analysis = useAnalysis()
const workspace = useWorkspaceStore()
const { syncTimeZone } = useAuth()
const { t } = useI18n()
const toast = useToast()

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
    <AppHeader />
    <main class="workspace-main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.workspace {
  min-height: 100dvh;
}

.workspace-main {
  min-width: 0;
  padding: var(--space-12) 0 var(--space-16);
}

/* Room for the bottom tab bar. */
@media (max-width: 640px) {
  .workspace-main {
    padding: var(--space-5) 0 calc(var(--control-lg) + var(--space-12) + env(safe-area-inset-bottom, 0px));
  }
}
</style>

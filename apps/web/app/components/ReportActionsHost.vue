<script setup lang="ts">
/**
 * The one place the delete confirmation lives, whichever card or row asked for it — and the one sheet of the
 * running analysis («Разбираем переписку», with cancel), whichever ring, button or card opened it.
 */
const actions = useReportActions()
const analysis = useAnalysis()
const workspace = useWorkspaceStore()
const report = computed(() => workspace.reports.find((item) => item.chatId === actions.pendingDelete.value) ?? null)
// The sheet belongs to one analysis: when it ends, the next one must not open with the sheet already up.
watch(analysis.isActive, (active) => {
  if (!active) analysis.details.value = false
})
</script>

<template>
  <DeleteReportDialog
    :open="!!actions.pendingDelete.value"
    :report="report"
    :loading="actions.deleting.value"
    @close="actions.pendingDelete.value = null"
    @confirm="actions.confirmDelete"
  />
  <AnalysisDetails :open="analysis.details.value" @close="analysis.details.value = false" />
</template>

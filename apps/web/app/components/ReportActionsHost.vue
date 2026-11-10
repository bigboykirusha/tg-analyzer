<script setup lang="ts">
/** The one place the delete confirmation lives, whichever card or row asked for it. */
const actions = useReportActions()
const workspace = useWorkspaceStore()
const report = computed(() => workspace.reports.find((item) => item.chatId === actions.pendingDelete.value) ?? null)
</script>

<template>
  <DeleteReportDialog
    :open="!!actions.pendingDelete.value"
    :report="report"
    :loading="actions.deleting.value"
    @close="actions.pendingDelete.value = null"
    @confirm="actions.confirmDelete"
  />
</template>

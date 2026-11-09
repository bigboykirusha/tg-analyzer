<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'

/** Deleting a report: the title names the chat, the line says what goes and what stays. */
defineProps<{ open: boolean; report: ReportSummaryDto | null; loading?: boolean }>()
const emit = defineEmits<{ close: []; confirm: [] }>()
const { t } = useI18n()
</script>

<template>
  <UiConfirmDialog
    :open="open"
    :title="report ? t('report.deleteTitleNamed', { chat: report.title }) : t('report.deleteTitle')"
    :description="t('report.deleteText')"
    :confirm-label="t('report.delete')"
    variant="danger"
    :loading="loading"
    @close="emit('close')"
    @confirm="emit('confirm')"
  />
</template>

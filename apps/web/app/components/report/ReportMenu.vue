<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'
import { MoreHorizontal, RotateCw, Trash2 } from '../../lib/icons'

/**
 * «⋯» of a report: the rare actions, «Обновить» and «Удалить». One menu wherever the report's actions stand — the
 * report's bar (phones; desktop once the poster has gone) and the poster itself on a computer, beside «Поделиться».
 * Over a poster its circle is the poster's translucent chip.
 */
const props = defineProps<{ summary: ReportSummaryDto }>()
const { t } = useI18n()
const actions = useReportActions()
const open = ref(false)
const updating = computed(() => actions.busy(props.summary.chatId))

function run(action: 'refresh' | 'delete') {
  open.value = false
  if (action === 'refresh') void actions.analyse(props.summary.chatId, props.summary.title)
  else actions.askDelete(props.summary.chatId)
}
</script>

<template>
  <UiPopoverMenu
    v-model:open="open"
    align="end"
    :aria-label="t('dashboard.reportMenu', { chat: summary.title })"
    :title="summary.title"
  >
    <template #trigger>
      <UiIconButton
        :label="t('dashboard.reportMenu', { chat: summary.title })"
        :icon="MoreHorizontal"
        no-tooltip
        aria-haspopup="menu"
        :aria-expanded="open"
        @click="open = !open"
      />
    </template>
    <UiMenuItem role="menuitem" :icon="RotateCw" :disabled="updating" @click="run('refresh')">
      {{ t('dashboard.refreshReport') }}
    </UiMenuItem>
    <UiMenuItem role="menuitem" :icon="Trash2" danger @click="run('delete')">{{ t('report.delete') }}</UiMenuItem>
  </UiPopoverMenu>
</template>

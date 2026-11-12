<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'
import { MoreHorizontal, RotateCw, Share, Trash2 } from '../../lib/icons'

/**
 * The report's bar (UiPageBar ): the name and the report's actions. Phones and tablets: a back circle, the
 * name in the middle, a share circle and «⋯» (over the poster only the circles). Desktop: the bar appears once
 * the poster has gone — the name on the left, «Поделиться» and «⋯». «⋯» holds the rare ones, «Обновить» and
 * «Удалить»: they live with the report, not on its tile at home.
 */
const props = defineProps<{
  summary: ReportSummaryDto
}>()
const emit = defineEmits<{ share: [] }>()
const { t } = useI18n()
const actions = useReportActions()
const menuOpen = ref(false)
const updating = computed(() => actions.busy(props.summary.chatId))

function run(action: 'refresh' | 'delete') {
  menuOpen.value = false
  if (action === 'refresh') void actions.analyse(props.summary.chatId, props.summary.title)
  else actions.askDelete(props.summary.chatId)
}
</script>

<template>
  <UiPageBar :title="summary.title" back="/dashboard" bar>
    <template #actions>
      <UiIconButton
        class="report-bar__narrow"
        :icon="Share"
        :label="t('share.open')"
        aria-haspopup="dialog"
        no-tooltip
        @click="emit('share')"
      />
      <UiButton
        class="report-bar__wide"
        variant="secondary"
        size="sm"
        :icon="Share"
        aria-haspopup="dialog"
        @click="emit('share')"
      >
        {{ t('share.open') }}
      </UiButton>
      <UiPopoverMenu
        v-model:open="menuOpen"
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
            :aria-expanded="menuOpen"
            @click="menuOpen = !menuOpen"
          />
        </template>
        <UiMenuItem role="menuitem" :icon="RotateCw" :disabled="updating" @click="run('refresh')">
          {{ t('dashboard.refreshReport') }}
        </UiMenuItem>
        <UiMenuItem role="menuitem" :icon="Trash2" danger @click="run('delete')">{{ t('report.delete') }}</UiMenuItem>
      </UiPopoverMenu>
    </template>
  </UiPageBar>
</template>

<style scoped>
.report-bar__wide {
  display: none;
}

@media (min-width: 901px) {
  .report-bar__narrow {
    display: none;
  }

  .report-bar__wide {
    display: inline-flex;
  }
}
</style>

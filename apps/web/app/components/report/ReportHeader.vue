<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'
import { Share } from '../../lib/icons'

/**
 * The report's bar (UiPageBar ): the name and the report's actions. Phones and tablets: a back circle, the
 * name in the middle, a share circle and «⋯» (over the poster only the circles). Desktop: the bar appears once
 * the poster has gone — the name on the left, «Поделиться» and «⋯». «⋯» holds the rare ones, «Обновить» and
 * «Удалить»: they live with the report, not on its tile at home.
 */
defineProps<{
  summary: ReportSummaryDto
}>()
const emit = defineEmits<{ share: [] }>()
const { t } = useI18n()
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
      <ReportMenu :summary="summary" />
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

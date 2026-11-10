<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'
import { Share } from '../../lib/icons'

/**
 * The report's bar (UiPageBar ): the name and nothing else. Phones and tablets: a back circle, the
 * name in the middle, a share circle (over the poster only the circles). Desktop: the bar appears once the
 * poster has gone — the name on the left, «Поделиться».
 */
defineProps<{
  summary: ReportSummaryDto
  /** The example report: back to the landing, «Войти» instead of sharing. */
  demo?: boolean
}>()
const emit = defineEmits<{ share: [] }>()
const { t } = useI18n()
</script>

<template>
  <UiPageBar :title="summary.title" :back="demo ? '/' : '/dashboard'" bar>
    <template #actions>
      <UiButton v-if="demo" variant="primary" size="sm" to="/login">{{ t('site.signIn') }}</UiButton>
      <template v-else>
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
      </template>
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

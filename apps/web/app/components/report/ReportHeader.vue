<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'
import { MoreHorizontal, RotateCw, Share2, Trash2 } from '../../lib/icons'

const props = withDefaults(
  defineProps<{
    summary: ReportSummaryDto
    canReanalyse?: boolean
    reanalysing?: boolean
    /** The demo report: only «Итоги», nothing to refresh or delete. */
    demo?: boolean
  }>(),
  { canReanalyse: false, reanalysing: false, demo: false },
)
const emit = defineEmits<{ reanalyse: []; story: []; delete: [] }>()
const { t, formatDay } = useI18n()
const isMobile = useMediaQuery('(max-width: 640px)')
const menuOpen = ref(false)

const period = computed(() => {
  const { firstMessageAt, lastMessageAt } = props.summary
  if (!firstMessageAt || !lastMessageAt) return t('common.na')
  const format = (value: string) => formatDay(value.slice(0, 10))
  return `${format(firstMessageAt)} – ${format(lastMessageAt)}`
})

function run(action: 'reanalyse' | 'delete') {
  menuOpen.value = false
  if (action === 'reanalyse') emit('reanalyse')
  else emit('delete')
}
</script>

<template>
  <UiPageHeader :title="summary.title" :lede="period" truncate class="report-header">
    <template #leading>
      <ChatAvatar :chat-id="summary.chatId" :title="summary.title" :size="isMobile ? 'md' : 'lg'" />
    </template>
    <template #actions>
      <UiButton class="report-header__story" variant="soft" size="sm" :icon="Share2" @click="emit('story')">
        <span class="report-header__story-label">{{ t('story.open') }}</span>
      </UiButton>
      <template v-if="!demo">
        <UiIconButton
          class="report-header__reanalyse"
          :icon="RotateCw"
          :label="t('report.reanalyse')"
          variant="secondary"
          :loading="reanalysing"
          :disabled="!canReanalyse"
          @click="emit('reanalyse')"
        />
        <UiPopoverMenu v-model:open="menuOpen" align="end" :aria-label="t('report.actions')">
          <template #trigger>
            <UiIconButton
              :icon="MoreHorizontal"
              :label="t('report.actions')"
              variant="ghost"
              :no-tooltip="menuOpen"
              aria-haspopup="menu"
              :aria-expanded="menuOpen"
              @click="menuOpen = !menuOpen"
            />
          </template>
          <UiMenuItem role="menuitem" :icon="RotateCw" :disabled="!canReanalyse" @click="run('reanalyse')">
            {{ t('report.reanalyse') }}
          </UiMenuItem>
          <div class="menu-divider" role="separator" />
          <UiMenuItem role="menuitem" :icon="Trash2" danger @click="run('delete')">
            {{ t('report.deleteMenu') }}
          </UiMenuItem>
        </UiPopoverMenu>
      </template>
    </template>
  </UiPageHeader>
</template>

<style scoped>
/* «Итоги» is the one thing people share, so it gets the lime accent. */
.report-header__story.btn {
  background: var(--lime);
  color: var(--on-lime);
}

@media (hover: hover) {
  .report-header__story.btn:hover {
    background: var(--lime-hover);
  }
}

/* A report header stays on one line: avatar and name left, actions right. */
.report-header {
  flex-wrap: nowrap;
  align-items: center;
}

.report-header :deep(.page-header__main) {
  flex-basis: 0;
}

/* Narrow phones: «Итоги» keeps its lime and icon, the name gets the room and steps down to h2. */
@media (max-width: 420px) {
  .report-header :deep(.page-header__title) {
    font: var(--text-h2);
    letter-spacing: -0.03em;
  }

  .report-header__story.btn {
    width: var(--control-sm);
    padding: 0;
  }

  .report-header__story-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }
}

@media (max-width: 640px) {
  /* Phones: refreshing lives in the «…» menu. */
  .report-header__reanalyse {
    display: none;
  }
}
</style>

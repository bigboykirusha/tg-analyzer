<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'
import { MoreHorizontal, RotateCw, Share2, Trash2 } from '../../lib/icons'

const props = defineProps<{
  summary: ReportSummaryDto
  canReanalyse: boolean
  reanalysing: boolean
}>()
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

function run(action: 'story' | 'reanalyse' | 'delete') {
  menuOpen.value = false
  if (action === 'story') emit('story')
  else if (action === 'reanalyse') emit('reanalyse')
  else emit('delete')
}
</script>

<template>
  <div class="report-header">
    <div class="report-header__identity">
      <ChatAvatar :chat-id="summary.chatId" :title="summary.title" :size="isMobile ? 'md' : 'lg'" />
      <div class="report-header__copy">
        <h1 class="report-header__title">{{ summary.title }}</h1>
        <p class="t-small t-muted">{{ period }}</p>
      </div>
    </div>

    <div class="report-header__actions no-print">
      <UiButton class="report-header__story" variant="soft" size="sm" :icon="Share2" @click="emit('story')">
        {{ t('story.open') }}
      </UiButton>
      <UiIconButton
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
        <UiMenuItem role="menuitem" class="report-header__story-item" :icon="Share2" @click="run('story')">
          {{ t('story.open') }}
        </UiMenuItem>
        <UiMenuItem role="menuitem" :icon="RotateCw" :disabled="!canReanalyse" @click="run('reanalyse')">
          {{ t('report.reanalyse') }}
        </UiMenuItem>
        <div class="menu-divider" role="separator" />
        <UiMenuItem role="menuitem" :icon="Trash2" danger @click="run('delete')">
          {{ t('report.deleteMenu') }}
        </UiMenuItem>
      </UiPopoverMenu>
    </div>
  </div>
</template>

<style scoped>
/* «Итоги» is a button on wide screens and a menu item on phones. */
.report-header__story-item {
  display: none;
}

@media (max-width: 640px) {
  .report-header__story {
    display: none;
  }

  .report-header__story-item {
    display: flex;
  }
}

.report-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-4);
  width: 100%;
  min-width: 0;
}

.report-header__identity {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.report-header__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-1);
}

.report-header__title {
  overflow: hidden;
  font: 600 30px/1.05 var(--font-sans);
  letter-spacing: -0.04em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

@media (max-width: 768px) {
  .report-header__title {
    font-size: 24px;
  }
}

@media (max-width: 640px) {
  .report-header {
    gap: var(--space-3);
  }

  .report-header__copy {
    gap: 0;
  }

  .report-header__title {
    font-size: 22px;
  }

  .report-header__copy .t-small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>

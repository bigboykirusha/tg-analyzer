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
  <UiPageBar :title="summary.title" :lede="period">
    <template #leading>
      <ChatAvatar :chat-id="summary.chatId" :title="summary.title" size="sm" />
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
          variant="ghost"
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
  </UiPageBar>
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

/* Phones: «Итоги» keeps its lime and icon, the name gets the room; refreshing lives in «…». */
@media (max-width: 640px) {
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

  .report-header__reanalyse {
    display: none;
  }
}
</style>

<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'
import { MoreHorizontal, RotateCw, Sparkles, Trash2 } from '../../lib/icons'

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
const { t, formatPeriod } = useI18n()
const menuOpen = ref(false)

/** Months only, «окт. 2025 – окт. 2026»: it fits next to the name on a phone; days are in Dynamics. */
const period = computed(() => formatPeriod(props.summary.firstMessageAt, props.summary.lastMessageAt, true))

function run(action: 'reanalyse' | 'delete') {
  menuOpen.value = false
  if (action === 'reanalyse') emit('reanalyse')
  else emit('delete')
}
</script>

<template>
  <UiPageBar :title="summary.title" :lede="period" :back="demo ? '' : '/dashboard'">
    <template #leading>
      <ChatAvatar class="report-header__avatar" :chat-id="summary.chatId" :title="summary.title" size="sm" />
    </template>
    <template #actions>
      <UiButton class="report-header__story" variant="soft" size="sm" :icon="Sparkles" @click="emit('story')">
        {{ t('story.open') }}
      </UiButton>
      <template v-if="!demo">
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
          <UiMenuItem
            role="menuitem"
            :icon="RotateCw"
            :disabled="!canReanalyse || reanalysing"
            @click="run('reanalyse')"
          >
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

/* Phones: the word «Итоги» stays — an icon alone read as «share my chat»; the back arrow takes the avatar's place. */
@media (max-width: 640px) {
  .report-header__avatar {
    display: none;
  }

  .report-header__story.btn {
    padding: 0 var(--space-3);
  }
}
</style>

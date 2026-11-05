<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'
import { RotateCw, Sparkles } from '../../lib/icons'

const props = withDefaults(
  defineProps<{
    summary: ReportSummaryDto
    canReanalyse?: boolean
    reanalysing?: boolean
    /** The demo report: one action, «Analyse a chat»; nothing to refresh or share. */
    demo?: boolean
  }>(),
  { canReanalyse: false, reanalysing: false, demo: false },
)
const emit = defineEmits<{ reanalyse: []; story: [] }>()
const { t, formatPeriod } = useI18n()

/** Months only, «окт. 2025 – окт. 2026»: it fits next to the name on a phone; days are in Dynamics. */
const period = computed(() =>
  props.demo ? t('example.title') : formatPeriod(props.summary.firstMessageAt, props.summary.lastMessageAt, true),
)
</script>

<template>
  <UiPageBar :title="summary.title" :lede="period" :back="demo ? '/' : '/dashboard'" :quiet-on-wide="demo">
    <template v-if="!demo" #leading>
      <ChatAvatar class="report-header__avatar" :chat-id="summary.chatId" :title="summary.title" size="sm" />
    </template>
    <template #actions>
      <UiButton v-if="demo" variant="primary" size="sm" to="/login">{{ t('site.signIn') }}</UiButton>
      <template v-else>
        <UiIconButton
          :icon="RotateCw"
          :label="t('report.reanalyse')"
          variant="ghost"
          size="sm"
          :loading="reanalysing"
          :disabled="!canReanalyse"
          @click="emit('reanalyse')"
        />
        <!-- «Итоги» is what the button opens; saving and sharing live on the slides. -->
        <UiButton
          class="report-header__share"
          variant="primary"
          size="sm"
          :icon="Sparkles"
          aria-haspopup="dialog"
          @click="emit('story')"
        >
          <span class="report-header__share-label">{{ t('story.open') }}</span>
        </UiButton>
      </template>
    </template>
  </UiPageBar>
</template>

<style scoped>
@media (max-width: 640px) {
  /* The title needs the room: the button is the recap icon alone, named for screen readers. */
  .report-header__share.btn {
    width: var(--control-sm);
    padding: 0;
  }

  .report-header__share-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
}
</style>

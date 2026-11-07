<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'
import { Share } from '../../lib/icons'

/**
 * The report's bar: back, the chat's avatar, its name and one action, «Поделиться» (it opens the
 * recap and its pictures). Refreshing and deleting live in the chat's row menu, not here.
 */
withDefaults(
  defineProps<{
    summary: ReportSummaryDto
    /** The demo report: one action, «Sign in»; nothing to share. */
    demo?: boolean
  }>(),
  { demo: false },
)
const emit = defineEmits<{ share: [] }>()
const { t } = useI18n()
</script>

<template>
  <UiPageBar :title="summary.title" :back="demo ? '/' : '/dashboard'" :quiet-on-wide="demo">
    <template v-if="!demo" #leading>
      <ChatAvatar class="report-header__avatar" :chat-id="summary.chatId" :title="summary.title" size="sm" />
    </template>
    <template #actions>
      <UiButton v-if="demo" variant="primary" size="sm" to="/login">{{ t('site.signIn') }}</UiButton>
      <UiButton v-else variant="primary" size="sm" :icon="Share" aria-haspopup="dialog" @click="emit('share')">
        {{ t('share.open') }}
      </UiButton>
    </template>
  </UiPageBar>
</template>

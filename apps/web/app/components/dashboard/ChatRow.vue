<script setup lang="ts">
import type { WorkspaceChat } from '../../stores/workspace'
import { RotateCw } from '../../lib/icons'

const props = defineProps<{
  chat: WorkspaceChat
  /** This chat is being analysed right now. */
  analysing: boolean
  /** Starting an analysis is not possible (another one runs, session inactive…). */
  disabled: boolean
  starting: boolean
}>()
const emit = defineEmits<{ analyse: [] }>()
const { t, tc, formatRelative } = useI18n()
const NuxtLink = resolveComponent('NuxtLink')

const reportPath = computed(() => (props.chat.report ? `/chat/${props.chat.id}` : null))
const subline = computed(() => {
  if (props.analysing) return t('dashboard.analysingNow')
  const report = props.chat.report
  if (!report) return t(`chatType.${props.chat.type}`)
  return `${t('dashboard.analysed', { time: formatRelative(report.analyzedAt) })} · ${tc('common.messagesCount', report.totalMessages)}`
})
</script>

<template>
  <div class="chat-row" :class="{ 'chat-row--active': analysing }">
    <component :is="reportPath ? NuxtLink : 'div'" :to="reportPath ?? undefined" class="chat-row__main">
      <ChatAvatar :chat-id="chat.id" :title="chat.title" :has-avatar="chat.hasAvatar" />
      <span class="chat-row__copy">
        <span class="chat-row__title">{{ chat.title }}</span>
        <span class="chat-row__subline t-small">{{ subline }}</span>
      </span>
    </component>

    <div class="chat-row__actions">
      <template v-if="chat.report">
        <UiButton :to="reportPath!" variant="secondary" class="chat-row__button">{{
          t('dashboard.openReport')
        }}</UiButton>
        <UiIconButton
          class="chat-row__refresh"
          :icon="RotateCw"
          :label="t('dashboard.reanalyse')"
          variant="secondary"
          :loading="starting"
          :disabled="disabled"
          @click="emit('analyse')"
        />
      </template>
      <UiButton
        v-else
        variant="primary"
        class="chat-row__button"
        :loading="starting || analysing"
        :disabled="disabled"
        @click="emit('analyse')"
      >
        {{ t('dashboard.analyse') }}
      </UiButton>
    </div>
  </div>
</template>

<style scoped>
.chat-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  min-height: 64px;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
  transition: background var(--transition-fast);
}

.chat-row:last-child {
  border-bottom: 0;
}

.chat-row:hover,
.chat-row--active {
  background: color-mix(in srgb, var(--accent-subtle) 45%, transparent);
}

.chat-row--active {
  box-shadow: inset 3px 0 0 var(--accent);
}

.chat-row__main {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.chat-row__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.chat-row__title {
  display: -webkit-box;
  overflow: hidden;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.3;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.chat-row__subline {
  overflow: hidden;
  color: var(--text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-row__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.chat-row__actions :deep(.btn) {
  min-height: 36px;
  height: 36px;
}

.chat-row__button {
  min-width: 104px;
  white-space: nowrap;
}

.chat-row__refresh {
  width: 36px;
}

@media (max-width: 640px) {
  .chat-row {
    padding: var(--space-3);
  }

  .chat-row__refresh {
    display: none;
  }

  .chat-row__button {
    min-width: 96px;
  }
}
</style>

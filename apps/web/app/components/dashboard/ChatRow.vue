<script setup lang="ts">
import type { WorkspaceChat } from '../../stores/workspace'
import { MoreHorizontal, RotateCw, Trash2 } from '../../lib/icons'

const props = defineProps<{
  chat: WorkspaceChat
  /** This chat is being analysed right now. */
  analysing: boolean
  /** 0–1 while the size is known, null otherwise. */
  progress?: number | null
  /** Telegram asked to wait (flood wait). */
  paused?: boolean
  /** Starting an analysis is not possible (another one runs, session inactive…). */
  disabled: boolean
  starting: boolean
  cancelling?: boolean
}>()
const emit = defineEmits<{ analyse: []; cancel: []; delete: [] }>()
const { t, tc, formatRelative, formatPercent } = useI18n()
const NuxtLink = resolveComponent('NuxtLink')
const menuOpen = ref(false)

const reportPath = computed(() => (props.chat.report ? `/chat/${props.chat.id}` : null))
const reportMeta = computed(() => {
  const report = props.chat.report
  if (!report) return ''
  return `${formatRelative(report.analyzedAt)} · ${tc('common.messagesCount', report.totalMessages)}`
})

function run(action: 'analyse' | 'delete') {
  menuOpen.value = false
  if (action === 'analyse') emit('analyse')
  else emit('delete')
}
</script>

<template>
  <div class="chat-row" :class="{ 'chat-row--active': analysing }">
    <component :is="reportPath ? NuxtLink : 'div'" :to="reportPath ?? undefined" class="chat-row__main">
      <ChatAvatar :chat-id="chat.id" :title="chat.title" :has-avatar="chat.hasAvatar" />
      <span class="chat-row__copy">
        <span class="chat-row__title">{{ chat.title }}</span>
        <span v-if="analysing && paused" class="chat-row__sub">
          <UiBadge tone="warning">{{ t('analysis.paused') }}</UiBadge>
          <span>{{ t('dashboard.analysingNow') }}</span>
        </span>
        <span v-else-if="analysing" class="chat-row__sub">
          <span
            class="chat-row__track"
            role="progressbar"
            :aria-label="t('analysis.progressLabel')"
            :aria-valuenow="progress == null ? undefined : Math.round(progress * 100)"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <span
              :class="{ 'is-indeterminate': progress == null }"
              :style="progress == null ? undefined : { width: `${Math.max(2, progress * 100)}%` }"
            />
          </span>
          <span class="chat-row__percent t-mono">{{
            progress == null ? t('dashboard.analysingNow') : formatPercent(progress * 100)
          }}</span>
        </span>
        <span v-else-if="chat.report" class="chat-row__sub">
          <UiBadge tone="accent">{{ t('dashboard.ready') }}</UiBadge>
          <span>{{ reportMeta }}</span>
        </span>
        <span v-else class="chat-row__sub">
          <UiBadge>{{ t(`chatType.${chat.type}`) }}</UiBadge>
          <span>{{ t('dashboard.notAnalysed') }}</span>
        </span>
      </span>
    </component>

    <div class="chat-row__actions">
      <UiButton v-if="analysing" variant="ghost" size="sm" :loading="cancelling" @click="emit('cancel')">
        {{ t('analysis.cancelShort') }}
      </UiButton>
      <template v-else-if="chat.report">
        <UiButton :to="reportPath!" variant="secondary" size="sm" class="chat-row__open">
          {{ t('dashboard.openReport') }}
        </UiButton>
        <UiPopoverMenu v-model:open="menuOpen" align="end" :aria-label="chat.title">
          <template #trigger>
            <UiIconButton
              :icon="MoreHorizontal"
              :label="t('common.more')"
              variant="ghost"
              size="sm"
              :loading="starting"
              :no-tooltip="menuOpen"
              aria-haspopup="menu"
              :aria-expanded="menuOpen"
              @click="menuOpen = !menuOpen"
            />
          </template>
          <UiMenuItem role="menuitem" :icon="RotateCw" :disabled="disabled" @click="run('analyse')">
            {{ t('dashboard.reanalyse') }}
          </UiMenuItem>
          <div class="menu-divider" role="separator" />
          <UiMenuItem role="menuitem" :icon="Trash2" danger @click="run('delete')">
            {{ t('report.deleteMenu') }}
          </UiMenuItem>
        </UiPopoverMenu>
      </template>
      <UiButton v-else variant="primary" size="sm" :loading="starting" :disabled="disabled" @click="emit('analyse')">
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
  gap: var(--space-4);
  min-height: 72px;
  padding: var(--space-3) var(--space-4);
  transition: background-color var(--transition-fast);
}

.chat-row + .chat-row {
  box-shadow: inset 0 1px 0 var(--border);
}

@media (hover: hover) {
  .chat-row:hover {
    background: var(--hover);
  }
}

.chat-row__main {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  border-radius: var(--radius-sm);
}

.chat-row__copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.chat-row__title {
  overflow: hidden;
  font-size: 15px;
  font-weight: 500;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-row__sub {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  color: var(--text-muted);
  font: var(--text-small);
}

.chat-row__sub > span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-row__track {
  position: relative;
  flex: 1 1 auto;
  min-width: 48px;
  max-width: 160px;
  height: 4px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--surface-2);
}

.chat-row__sub > span.chat-row__percent {
  flex: none;
  overflow: visible;
}

.chat-row__track > span {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: var(--accent);
  transition: width var(--transition-slow);
}

.chat-row__track > .is-indeterminate {
  width: 34%;
  animation: row-indeterminate 1.4s var(--ease-standard) infinite;
}

@keyframes row-indeterminate {
  from {
    transform: translateX(-110%);
  }

  to {
    transform: translateX(310%);
  }
}

.chat-row__actions {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

/* Phones: tapping the row opens the report. */
@media (max-width: 640px) {
  .chat-row {
    gap: var(--space-3);
    padding: var(--space-3);
  }

  .chat-row__open {
    display: none;
  }
}
</style>

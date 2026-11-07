<script setup lang="ts">
import type { WorkspaceChat } from '../../stores/workspace'
import { MoreHorizontal, RotateCw, Trash2, User, Users } from '../../lib/icons'

const props = defineProps<{
  chat: WorkspaceChat
  /** This chat is being analysed right now. */
  analysing: boolean
  /** 0–1 while the size is known, null otherwise. */
  progress?: number | null
  /** Telegram asked to wait (flood wait). */
  paused?: boolean
  /** Waiting for another analysis to finish. */
  queued?: boolean
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
  return t('dashboard.analysed', { time: formatRelative(report.analyzedAt) })
})
/** Phones keep the line under the name whole: «Обновлён 39 мин. назад». */
const reportMetaShort = computed(() => {
  const report = props.chat.report
  if (!report) return ''
  return t('dashboard.analysed', { time: formatRelative(report.analyzedAt, 'short') })
})

/** The type is shown by the icon; its name is only read aloud, so the time fits on a phone. */
const typeLabel = computed(() => t(props.chat.type === 'private' ? 'chatType.private' : 'chatType.group'))
const lastActivity = computed(() => (props.chat.lastMessageAt ? formatRelative(props.chat.lastMessageAt) : ''))

function run(action: 'analyse' | 'delete') {
  menuOpen.value = false
  if (action === 'analyse') emit('analyse')
  else emit('delete')
}
</script>

<template>
  <div class="chat-row" :class="{ 'chat-row--active': analysing, 'chat-row--link': reportPath }">
    <component :is="reportPath ? NuxtLink : 'div'" :to="reportPath ?? undefined" class="chat-row__main">
      <ChatAvatar :chat-id="chat.id" :title="chat.title" :has-avatar="chat.hasAvatar" />
      <span class="chat-row__copy">
        <span class="chat-row__title">{{ chat.title }}</span>
        <span v-if="queued" class="chat-row__sub">
          <span>{{ t('dashboard.queued') }}</span>
        </span>
        <span v-else-if="analysing && paused" class="chat-row__sub">
          <span>{{ t('analysis.paused') }}, {{ t('dashboard.analysingNow') }}</span>
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
              :style="progress == null ? undefined : { transform: `scaleX(${Math.max(0.02, progress)})` }"
            />
          </span>
          <span class="chat-row__percent t-num">{{
            progress == null ? t('dashboard.analysingNow') : formatPercent(progress * 100)
          }}</span>
        </span>
        <span v-else-if="chat.report" class="chat-row__sub chat-row__sub--report">
          <span class="chat-row__meta-long">{{ reportMeta }}</span>
          <span class="chat-row__meta-short" aria-hidden="true">{{ reportMetaShort }}</span>
          <span class="chat-row__report-count">{{ tc('common.messagesCount', chat.report.totalMessages) }}</span>
        </span>
        <span v-else class="chat-row__sub">
          <component :is="chat.type === 'private' ? User : Users" class="chat-row__type-icon" aria-hidden="true" />
          <span class="sr-only">{{ typeLabel }}</span>
          <span>{{ lastActivity }}</span>
        </span>
      </span>
    </component>

    <div class="chat-row__actions">
      <UiButton v-if="queued" variant="ghost" size="sm" @click="emit('cancel')">
        {{ t('dashboard.removeFromQueue') }}
      </UiButton>
      <UiButton v-else-if="analysing" variant="ghost" size="sm" :loading="cancelling" @click="emit('cancel')">
        {{ t('analysis.cancelShort') }}
      </UiButton>
      <template v-else-if="chat.report">
        <UiButton :to="reportPath!" variant="secondary" size="sm" class="chat-row__open">
          <!-- Phones show «Открыть»; the full name stays for screen readers and tests. -->
          <span class="chat-row__open-long">{{ t('dashboard.openReport') }}</span>
          <span class="chat-row__open-short" aria-hidden="true">{{ t('dashboard.openShort') }}</span>
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
      <UiButton v-else variant="secondary" size="sm" :loading="starting" :disabled="disabled" @click="emit('analyse')">
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
  min-height: calc(var(--avatar-md) + 2 * var(--space-4));
  padding: var(--space-3) var(--space-4);
  transition: background-color var(--transition-fast);
}

.chat-row + .chat-row {
  box-shadow: var(--divider-top);
}

/* Hairlines start under the text, not under the avatar. */
@supports (background: linear-gradient(red, red)) {
  .chat-row + .chat-row {
    box-shadow: none;
    background-image: linear-gradient(var(--border), var(--border));
    background-repeat: no-repeat;
    background-position: calc(var(--space-4) + var(--avatar-md) + var(--space-3)) 0;
    background-size: 100% 1px;
  }
}

/* Only a row that opens something lights up; a row with just a button stays still. */
@media (hover: hover) and (pointer: fine) {
  .chat-row--link:hover {
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
  gap: var(--space-0-5);
  min-width: 0;
}

.chat-row__title {
  overflow: hidden;
  font: var(--text-title);
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

.chat-row__sub > span:last-child,
.chat-row__sub--report > span:first-child,
.chat-row__sub--report > .chat-row__meta-short {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-row__type-icon {
  --icon-size: var(--icon-sm);
}

.chat-row__report-count::before {
  content: '·';
  margin-right: var(--space-2);
}

.chat-row__track {
  position: relative;
  flex: 1 1 auto;
  min-width: var(--space-12);
  max-width: calc(var(--space-20) * 2);
  height: var(--bar-height);
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
  inset: 0;
  border-radius: inherit;
  background: var(--accent);
  transform-origin: left;
  transition: transform var(--transition-slow);
}

.chat-row__track > .is-indeterminate {
  right: auto;
  width: 34%;
  animation: row-indeterminate var(--duration-loop) var(--ease-loop) infinite;
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

/* Phones: a tighter row; the report opens from «Открыть». */
@media (max-width: 640px) {
  .chat-row {
    gap: var(--space-3);
    padding: var(--space-3);
  }

  .chat-row__title {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    white-space: normal;
    /* Break between words; a single word longer than the line is hyphenated, not cut anywhere. */
    overflow-wrap: break-word;
    hyphens: auto;
  }
}

.chat-row__open-short,
.chat-row__meta-short {
  display: none;
}

@media (max-width: 640px) {
  .chat-row__open-long {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }

  .chat-row__open-short,
  .chat-row__meta-short {
    display: inline;
  }

  /* Still read aloud in full; only the short line is drawn. */
  .chat-row__meta-long {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }

  /* One line under the name on phones: when it was updated; the count lives in the report. */
  .chat-row__report-count {
    display: none;
  }
}
</style>

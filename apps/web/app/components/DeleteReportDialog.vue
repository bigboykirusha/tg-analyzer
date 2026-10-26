<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'
import { BarChart2, Clock, Share2, Trash2 } from '../lib/icons'

/** Deleting a report: names the chat and lists exactly what goes away. */
const props = defineProps<{
  open: boolean
  report: ReportSummaryDto | null
  loading?: boolean
}>()

const emit = defineEmits<{ close: []; confirm: [] }>()
const { t, tc } = useI18n()

const DAY_MS = 86_400_000

const losses = computed(() => {
  const report = props.report
  if (!report) return []
  const first = report.firstMessageAt ? Date.parse(report.firstMessageAt) : NaN
  const last = report.lastMessageAt ? Date.parse(report.lastMessageAt) : NaN
  const days =
    Number.isFinite(first) && Number.isFinite(last) ? Math.max(1, Math.round((last - first) / DAY_MS) + 1) : null
  return [
    {
      icon: BarChart2,
      label: t('report.lose.stats'),
      value: days ? tc('report.lose.days', days) : tc('common.messagesCount', report.totalMessages),
    },
    { icon: Share2, label: t('report.lose.story'), value: t('report.lose.storyValue') },
    { icon: Clock, label: t('report.lose.history'), value: t('report.lose.historyValue') },
  ]
})
</script>

<template>
  <UiConfirmDialog
    :open="open"
    :title="t('report.deleteTitle')"
    :description="t('report.deleteText')"
    :confirm-label="t('report.delete')"
    :confirm-icon="Trash2"
    variant="danger"
    :loading="loading"
    @close="emit('close')"
    @confirm="emit('confirm')"
  >
    <template v-if="report" #subject>
      <div class="subject">
        <ChatAvatar :chat-id="report.chatId" :title="report.title" size="sm" />
        <div class="subject__text">
          <b class="subject__name">{{ report.title }}</b>
          <small class="subject__meta">
            {{ t(`chatType.${report.type}`).toLowerCase() }} · {{ tc('common.messagesCount', report.totalMessages) }}
          </small>
        </div>
      </div>
    </template>
    <ul v-if="losses.length" class="lose" :aria-label="t('report.lose.label')">
      <li v-for="loss in losses" :key="loss.label" class="lose__row">
        <component :is="loss.icon" class="lose__icon" aria-hidden="true" />
        <span class="lose__label">{{ loss.label }}</span>
        <span class="lose__value">{{ loss.value }}</span>
      </li>
    </ul>
  </UiConfirmDialog>
</template>

<style scoped>
.subject {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.subject__text {
  display: grid;
  min-width: 0;
}

.subject__name {
  overflow: hidden;
  font: 600 15px/20px var(--font-sans);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subject__meta {
  color: var(--text-muted);
  font: var(--text-small);
}

.lose {
  margin: 0;
  padding: var(--space-1) var(--space-4);
  border-radius: var(--radius-xl);
  background: var(--fill-raised);
  list-style: none;
}

.lose__row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 44px;
  font: var(--text-ui);
}

.lose__row + .lose__row {
  border-top: 1px solid var(--border);
}

.lose__icon {
  flex: none;
  width: var(--icon-sm);
  height: var(--icon-sm);
  color: var(--text-muted);
}

.lose__label {
  flex: 1;
  min-width: 0;
}

.lose__value {
  color: var(--text-muted);
  font: var(--text-small);
  white-space: nowrap;
}
</style>

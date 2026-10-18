<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'
import { ChevronRight, User, Users } from '../../lib/icons'

const props = defineProps<{
  report: ReportSummaryDto
  hasAvatar?: boolean
  /** A fresh analysis of this chat is running or queued. */
  updating?: boolean
}>()
const { t, tc, formatRelative, formatDay } = useI18n()

const period = computed(() => {
  const { firstMessageAt, lastMessageAt } = props.report
  if (!firstMessageAt || !lastMessageAt) return null
  return `${formatDay(firstMessageAt.slice(0, 10))} – ${formatDay(lastMessageAt.slice(0, 10))}`
})
const isGroup = computed(() => props.report.type === 'group')
</script>

<template>
  <NuxtLink :to="`/chat/${report.chatId}`" class="report-card">
    <span class="report-card__head">
      <ChatAvatar :chat-id="report.chatId" :title="report.title" :has-avatar="hasAvatar" />
      <span class="report-card__type">
        <component :is="isGroup ? Users : User" aria-hidden="true" />
        {{ t(isGroup ? 'chatType.group' : 'chatType.private') }}
      </span>
    </span>
    <span class="report-card__title">{{ report.title }}</span>
    <span class="report-card__count">{{ tc('common.messagesCount', report.totalMessages) }}</span>
    <span v-if="period" class="report-card__meta">{{ period }}</span>
    <span class="report-card__foot">
      <span v-if="updating" class="report-card__updating">
        <span class="report-card__spinner" aria-hidden="true" />{{ t('dashboard.analysingNow') }}
      </span>
      <span v-else>{{ t('dashboard.analysed', { time: formatRelative(report.analyzedAt) }) }}</span>
      <ChevronRight class="report-card__chevron" aria-hidden="true" />
    </span>
  </NuxtLink>
</template>

<style scoped>
.report-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-5);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

@media (hover: hover) {
  .report-card:hover {
    border-color: var(--border-strong);
    box-shadow: var(--shadow);
  }

  .report-card:hover .report-card__chevron {
    color: var(--text);
    transform: translateX(2px);
  }
}

.report-card:active {
  transform: scale(0.99);
}

.report-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.report-card__type {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  background: var(--surface-2);
  color: var(--text-muted);
  font: var(--text-caption);
  --icon-size: 12px;
}

.report-card__title {
  overflow: hidden;
  font: var(--text-title);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-card__count {
  font: var(--text-ui);
  font-variant-numeric: tabular-nums;
}

.report-card__meta {
  overflow: hidden;
  color: var(--text-muted);
  font: var(--text-small);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-4);
  color: var(--text-muted);
  font: var(--text-small);
}

.report-card__updating {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--accent-ink);
  font-weight: 600;
}

.report-card__spinner {
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.report-card__chevron {
  color: var(--text-muted);
  transition:
    color var(--transition-fast),
    transform var(--transition-fast);
}
</style>

<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'
import { ChevronRight } from '../../lib/icons'

const props = defineProps<{
  report: ReportSummaryDto
  hasAvatar?: boolean
  /** A fresh analysis of this chat is running or queued. */
  updating?: boolean
}>()
const { t, tc, formatRelative, formatPeriod, formatNumber, formatPercent } = useI18n()

const isGroup = computed(() => props.report.type === 'group')
/** «Личный чат · март – окт. 2026»: the kind and the span in one quiet line, no chip. */
const subline = computed(() => {
  const { firstMessageAt, lastMessageAt } = props.report
  const period = firstMessageAt && lastMessageAt ? formatPeriod(firstMessageAt, lastMessageAt, true) : null
  return [t(isGroup.value ? 'chatType.group' : 'chatType.private'), period].filter(Boolean).join(' · ')
})
/** Summaries cached before pulses existed have none. */
const pulse = computed(() =>
  props.report.pulse?.some((week) => week.sent || week.received) ? props.report.pulse : null,
)
const share = computed(() => (isGroup.value ? null : (props.report.headline?.sentSharePct ?? null)))
</script>

<template>
  <NuxtLink :to="`/chat/${report.chatId}`" class="report-card">
    <span class="report-card__head">
      <ChatAvatar :chat-id="report.chatId" :title="report.title" :has-avatar="hasAvatar" />
      <span class="report-card__who">
        <span class="report-card__title">{{ report.title }}</span>
        <span class="report-card__meta">{{ subline }}</span>
      </span>
    </span>
    <span class="report-card__count">
      <strong class="t-num">{{ formatNumber(report.totalMessages) }}</strong>
      {{ tc('dashboard.messagesWord', report.totalMessages)
      }}<template v-if="share !== null"> · {{ t('dashboard.yourShare', { share: formatPercent(share) }) }}</template>
    </span>
    <Seismograph
      v-if="pulse"
      class="report-card__pulse"
      :days="pulse"
      :height="36"
      :label="t('dashboard.pulseLabel')"
    />
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
  border-radius: var(--radius-card);
  background: var(--surface);
  transition:
    box-shadow var(--transition-fast),
    transform var(--duration-press) var(--ease-standard);
}

@media (hover: hover) and (pointer: fine) {
  .report-card:hover {
    box-shadow: 0 0 0 1px var(--border-strong);
  }

  .report-card:hover .report-card__chevron {
    color: var(--text);
    transform: translateX(2px);
  }
}

.report-card:active {
  transform: scale(var(--press-scale));
}

.report-card__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.report-card__who {
  display: grid;
  min-width: 0;
}

.report-card__title {
  overflow: hidden;
  font: var(--text-title);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* The size of the chat as a figure, the share beside it in the quiet voice. */
.report-card__count {
  color: var(--text-muted);
  font: var(--text-small);
  font-variant-numeric: tabular-nums;
}

.report-card__count strong {
  margin-right: var(--space-1);
  color: var(--text);
  font: var(--text-figure-sm);
  letter-spacing: -0.03em;
}

.report-card__meta {
  overflow: hidden;
  color: var(--text-muted);
  font: var(--text-small);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.report-card__pulse {
  width: 100%;
  margin-top: var(--space-4);
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
  color: var(--text);
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

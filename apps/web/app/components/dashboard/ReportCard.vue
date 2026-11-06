<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'
import { ChevronRight } from '../../lib/icons'

const props = defineProps<{
  report: ReportSummaryDto
  hasAvatar?: boolean
  /** A fresh analysis of this chat is running or queued. */
  updating?: boolean
}>()
const { t, tc, formatRelative, formatPeriod, formatNumber } = useI18n()

const isGroup = computed(() => props.report.type === 'group')
/** «март – окт. 2026», «Группа · март – окт. 2026»: a private chat is the default and needs no label. */
const subline = computed(() => {
  const { firstMessageAt, lastMessageAt } = props.report
  const period = firstMessageAt && lastMessageAt ? formatPeriod(firstMessageAt, lastMessageAt, true) : null
  return [isGroup.value ? t('chatType.group') : null, period].filter(Boolean).join(' · ')
})
/** Summaries cached before pulses existed have none. */
const pulse = computed(() =>
  props.report.pulse?.some((week) => week.sent || week.received) ? props.report.pulse : null,
)
/** Keep report size and freshness on separate lines on a phone. */
const line = computed(() =>
  [isGroup.value ? t('chatType.group') : null, tc('common.messagesCount', props.report.totalMessages)]
    .filter(Boolean)
    .join(' · '),
)
const updated = computed(() =>
  props.updating
    ? t('dashboard.analysingNow')
    : t('dashboard.analysed', { time: formatRelative(props.report.analyzedAt) }),
)
</script>

<template>
  <NuxtLink :to="`/chat/${report.chatId}`" class="report-card">
    <span class="report-card__head">
      <ChatAvatar :chat-id="report.chatId" :title="report.title" :has-avatar="hasAvatar" />
      <span class="report-card__who">
        <span class="report-card__title">{{ report.title }}</span>
        <span class="report-card__meta">{{ subline }}</span>
        <span class="report-card__line">{{ line }}</span>
        <span class="report-card__updated">{{ updated }}</span>
      </span>
      <ChevronRight class="report-card__row-chevron" aria-hidden="true" />
    </span>
    <span class="report-card__count">
      <strong class="t-num">{{ formatNumber(report.totalMessages) }}</strong>
      {{ tc('dashboard.messagesWord', report.totalMessages) }}
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
        <span class="spinner" aria-hidden="true" />{{ t('dashboard.analysingNow') }}
      </span>
      <span v-else>{{ updated }}</span>
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
  border-radius: var(--radius-lg);
  background: var(--surface);
  transition:
    box-shadow var(--transition-fast),
    transform var(--duration-fast) var(--ease-standard);
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
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
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
  font-weight: 500;
}

.report-card__chevron {
  color: var(--text-muted);
  transition:
    color var(--transition-fast),
    transform var(--transition-fast);
}

.report-card__line,
.report-card__updated,
.report-card__row-chevron {
  display: none;
}

/* Phones: a row with readable size and freshness instead of a clipped sentence. */
@media (max-width: 640px) {
  .report-card {
    padding: var(--space-3) 0;
    border-radius: 0;
    background: none;
  }

  .report-card + .report-card {
    border-top: 1px solid var(--border);
  }

  .report-card__head {
    margin-bottom: 0;
  }

  .report-card__who {
    flex: 1;
  }

  .report-card__meta,
  .report-card__count,
  .report-card__pulse,
  .report-card__foot {
    display: none;
  }

  /* Up to two lines: the time of the analysis is the part that gets cut first otherwise. */
  .report-card__line {
    display: block;
    color: var(--text-muted);
    font: var(--text-small);
    overflow-wrap: anywhere;
  }

  .report-card__updated {
    display: block;
    color: var(--text-muted);
    font: var(--text-caption);
  }

  .report-card__title {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .report-card__row-chevron {
    display: block;
    flex: none;
    color: var(--text-muted);
  }
}
</style>

<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'
import { ChevronRight } from '../../lib/icons'
import { hueOf } from '../../lib/hue'

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
  return [isGroup.value ? t('chatType.group') : null, period].filter(Boolean).join(', ')
})
/** Summaries cached before pulses existed have none. */
const pulse = computed(() =>
  props.report.pulse?.some((week) => week.sent || week.received) ? props.report.pulse : null,
)
/** On wide screens the card is the person's small poster: their colour, their name, their pulse. */
const hue = computed(() => hueOf(props.report.chatId))
const updated = computed(() =>
  props.updating
    ? t('dashboard.analysingNow')
    : t('dashboard.analysed', { time: formatRelative(props.report.analyzedAt) }),
)
</script>

<template>
  <NuxtLink :to="`/chat/${report.chatId}`" class="report-card" :data-hue="hue">
    <span class="report-card__head">
      <ChatAvatar :chat-id="report.chatId" :title="report.title" :has-avatar="hasAvatar" />
      <span class="report-card__who">
        <span class="report-card__title">{{ report.title }}</span>
        <span class="report-card__meta">{{ subline }}</span>
      </span>
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
  padding: var(--space-6);
  border-radius: var(--radius-lg);
  background: var(--surface);
  transition:
    box-shadow var(--transition-fast),
    transform var(--duration-fast) var(--ease-standard);
}

/*
 * A small poster, like the top of the report it opens — the person's colour, light type, the pulse in
 * the poster's own ink (you solid, them translucent). Tapping it leads into the same colour.
 */
.report-card {
  --text: var(--on-poster);
  --text-muted: var(--on-poster-muted);
  --border-strong: var(--on-poster-line);
  --you: var(--on-poster);
  --them: var(--on-poster-muted);
  background: var(--poster);
  color: var(--text);
}

/* The poster carries the person's colour, so the avatar would only repeat it; the name speaks. */
.report-card__head :deep(.avatar),
.report-card__head > :first-child {
  display: none;
}

.report-card__title {
  font: var(--text-h3);
  letter-spacing: var(--tracking-h3);
}
@media (hover: hover) and (pointer: fine) {
  .report-card:hover {
    box-shadow: var(--shadow-overlay);
  }

  .report-card:hover .report-card__chevron {
    color: var(--text);
    transform: translateX(var(--space-0-5));
  }
}

.report-card:active {
  transform: scale(var(--press-scale-lg));
  transition-duration: var(--duration-press);
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

/* Phones: the same small poster, two to a row — the name, the size of the chat and its pulse. */
@media (max-width: 640px) {
  .report-card {
    gap: var(--space-1);
    min-height: calc(var(--space-20) * 2);
    padding: var(--space-4);
  }

  .report-card__head {
    margin-bottom: 0;
  }

  .report-card__meta,
  .report-card__foot {
    display: none;
  }

  .report-card__title {
    display: -webkit-box;
    font: var(--text-title);
    font-weight: 600;
    white-space: normal;
    overflow-wrap: anywhere;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .report-card__count strong {
    font: var(--text-small);
    font-weight: 600;
  }

  .report-card__pulse {
    margin-top: auto;
    padding-top: var(--space-3);
  }
}
</style>

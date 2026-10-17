<script setup lang="ts">
import type { ParseProgressDto } from '@tg-analyzer/shared'

const props = defineProps<{ progress: ParseProgressDto; cancelling?: boolean; queuedCount?: number }>()
const emit = defineEmits<{ cancel: [] }>()
const { t, tc, formatNumber, formatPercent, formatDuration, formatCountdown } = useI18n()

const now = useNow(1000)
const elapsedSeconds = computed(() =>
  props.progress.startedAt ? Math.max(0, (now.value - props.progress.startedAt) / 1000) : 0,
)

/** Real fraction when Telegram reported the chat size, otherwise unknown. */
const fraction = computed(() => {
  const { scannedMessages, totalMessages, phase } = props.progress
  if (phase === 'saving') return 1
  if (!totalMessages || phase !== 'scanning') return null
  return Math.min(1, scannedMessages / totalMessages)
})

const phaseLabel = computed(() => {
  const { phase, waitSeconds } = props.progress
  if (phase === 'waiting') return t('analysis.phase.waiting', { time: formatCountdown(waitSeconds ?? 0) })
  return t(`analysis.phase.${phase ?? 'queued'}`)
})

const counter = computed(() => {
  const { scannedMessages, totalMessages } = props.progress
  if (!scannedMessages) return null
  return totalMessages
    ? t('analysis.scannedOf', { scanned: formatNumber(scannedMessages), total: formatNumber(totalMessages) })
    : tc('analysis.scanned', scannedMessages)
})

const remaining = computed(() => {
  const value = fraction.value
  if (value === null || value < 0.03 || elapsedSeconds.value < 10) return null
  const seconds = (elapsedSeconds.value / value) * (1 - value)
  return seconds >= 30 ? formatDuration(seconds) : null
})
</script>

<template>
  <section class="panel analysis-progress" aria-live="polite">
    <div class="analysis-progress__head">
      <ChatAvatar :chat-id="progress.chatId ?? ''" :title="progress.chatTitle" size="sm" />
      <div class="analysis-progress__copy">
        <h2 class="analysis-progress__title">
          {{ t('analysis.title', { chat: progress.chatTitle || t('analysis.untitledChat') }) }}
        </h2>
        <p class="analysis-progress__phase">
          <span>{{ phaseLabel }}</span>
        </p>
      </div>
      <UiButton variant="ghost" size="sm" :loading="cancelling" @click="emit('cancel')">
        {{ cancelling ? t('analysis.cancelling') : t('analysis.cancelShort') }}
      </UiButton>
    </div>

    <div
      class="track"
      :class="{ 'track--indeterminate': fraction === null }"
      role="progressbar"
      :aria-label="t('analysis.progressLabel')"
      :aria-valuenow="fraction === null ? undefined : Math.round(fraction * 100)"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <span :style="fraction === null ? undefined : { width: `${Math.max(2, fraction * 100)}%` }" />
    </div>

    <div class="analysis-progress__meta">
      <span class="analysis-progress__counter">{{ counter ?? t('analysis.preparing') }}</span>
      <span>
        <template v-if="fraction !== null">{{ formatPercent(fraction * 100) }} · </template>
        <template v-if="remaining">{{ t('analysis.remaining', { time: remaining }) }}</template>
        <template v-else>{{ t('analysis.elapsed', { time: formatCountdown(elapsedSeconds) }) }}</template>
      </span>
    </div>
    <p v-if="queuedCount" class="analysis-progress__queue">{{ tc('analysis.queuedMore', queuedCount) }}</p>
  </section>
</template>

<style scoped>
.analysis-progress {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
  padding: var(--space-5);
  animation: fade-in var(--transition-normal) both;
}

.analysis-progress__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.analysis-progress__copy {
  display: grid;
  flex: 1 1 auto;
  min-width: 0;
}

.analysis-progress__title {
  overflow: hidden;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analysis-progress__phase {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  color: var(--text-muted);
  font: var(--text-small);
}

.analysis-progress__meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-2);
  color: var(--text-muted);
  font: var(--text-small);
}

.analysis-progress__queue {
  color: var(--text-muted);
  font: var(--text-small);
}

.analysis-progress__counter {
  color: var(--text);
}

.track {
  position: relative;
  height: 8px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--surface-2);
}

.track span {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: var(--accent);
  transition: width var(--transition-slow);
}

.track--indeterminate span {
  width: 34%;
  animation: indeterminate 1.4s var(--ease-standard) infinite;
}

@keyframes indeterminate {
  from {
    transform: translateX(-110%);
  }

  to {
    transform: translateX(310%);
  }
}
</style>

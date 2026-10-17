<script setup lang="ts">
import type { ParseProgressDto } from '@tg-analyzer/shared'
import { Square } from '../../lib/icons'

const props = defineProps<{ progress: ParseProgressDto; cancelling?: boolean }>()
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
  <section class="analysis-progress" aria-live="polite">
    <div class="analysis-progress__header">
      <div class="analysis-progress__copy">
        <h2 class="analysis-progress__title">
          {{ t('analysis.title', { chat: progress.chatTitle || t('analysis.untitledChat') }) }}
        </h2>
        <p class="t-small t-muted">{{ phaseLabel }}</p>
      </div>
      <UiIconButton
        :icon="Square"
        :label="cancelling ? t('analysis.cancelling') : t('analysis.cancel')"
        variant="danger"
        size="sm"
        :disabled="cancelling"
        @click="emit('cancel')"
      />
    </div>

    <div
      class="analysis-progress__bar"
      :class="{ 'is-indeterminate': fraction === null }"
      role="progressbar"
      :aria-label="t('analysis.progressLabel')"
      :aria-valuenow="fraction === null ? undefined : Math.round(fraction * 100)"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <span :style="fraction === null ? undefined : { width: `${Math.max(2, fraction * 100)}%` }" />
    </div>

    <div class="analysis-progress__meta t-small">
      <span>{{ counter ?? t('analysis.preparing') }}</span>
      <span class="t-muted">
        <template v-if="fraction !== null">{{ formatPercent(fraction * 100) }} · </template>
        <template v-if="remaining">{{ t('analysis.remaining', { time: remaining }) }}</template>
        <template v-else>{{ t('analysis.elapsed', { time: formatCountdown(elapsedSeconds) }) }}</template>
      </span>
    </div>
  </section>
</template>

<style scoped>
.analysis-progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-5);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  animation: fade-in var(--transition-normal) both;
}

.analysis-progress__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.analysis-progress__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-1);
}

.analysis-progress__title {
  overflow: hidden;
  font-size: 1.0625rem;
  font-weight: 650;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analysis-progress__bar {
  position: relative;
  height: 6px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--surface) 80%, var(--border));
}

.analysis-progress__bar span {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: var(--accent);
  transition: width var(--transition-slow);
}

.analysis-progress__bar.is-indeterminate span {
  width: 34%;
  animation: indeterminate 1.4s ease-in-out infinite;
}

.analysis-progress__meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-2);
}

@keyframes indeterminate {
  from {
    transform: translateX(-110%);
  }

  to {
    transform: translateX(310%);
  }
}

@media (max-width: 640px) {
  .analysis-progress {
    padding: var(--space-4);
    border-radius: var(--radius-md);
  }
}
</style>

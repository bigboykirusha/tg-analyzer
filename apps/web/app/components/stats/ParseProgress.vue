<script setup lang="ts">
import type { ParseProgressPhase } from '@tg-analyzer/shared'
import { Square } from '../../lib/icons'
import IconButton from '../ui/IconButton.vue'

const props = defineProps<{
  current: number
  total: number
  chatName: string
  status: string
  message?: string
  cancellable?: boolean
  cancelling?: boolean
  scannedMessages?: number
  startTime?: number
  compact?: boolean
  phase?: ParseProgressPhase
}>()

const emit = defineEmits<{ cancel: [] }>()
const { t, formatNumber } = useI18n()

const elapsedSeconds = ref(0)
let timer: number | null = null

const normalizedMessage = computed(() => props.message?.trim() ?? '')
const isScanningMessage = computed(() => /^Scanning\s+[\d,\s]+\s+messages$/i.test(normalizedMessage.value))

const phaseInfo = computed(() => {
  const phases: Record<ParseProgressPhase, { message: string; currentStep: number }> = {
    queued: { message: t('parse.queued'), currentStep: 1 },
    connecting: { message: t('parse.connecting'), currentStep: 2 },
    'loading-dialogs': { message: t('parse.loadingChats'), currentStep: 3 },
    scanning: { message: t('parse.scanningMessages'), currentStep: 4 },
    saving: { message: t('parse.saving'), currentStep: 5 },
    retrying: { message: t('parse.retrying'), currentStep: 2 },
  }

  if (props.phase) {
    return { ...phases[props.phase], totalSteps: 5 }
  }

  if (props.status === 'pending') {
    return { ...phases.queued, totalSteps: 5 }
  }

  const message = normalizedMessage.value
  if (!message) {
    return null
  }

  if (/flood|rate.?limit|too many requests|wait\s+\d+\s*(?:s|sec|seconds)/i.test(message)) {
    return { message: t('parse.telegramPause'), currentStep: 4, totalSteps: 5 }
  }

  if (/^Connecting to Telegram$/i.test(message)) {
    return { ...phases.connecting, totalSteps: 5 }
  }

  if (/^Loading chat list$/i.test(message)) {
    return { ...phases['loading-dialogs'], totalSteps: 5 }
  }

  if (/^Starting message scan$/i.test(message)) {
    return { message: t('parse.preparingScan'), currentStep: 4, totalSteps: 5 }
  }

  if (isScanningMessage.value) {
    return { ...phases.scanning, totalSteps: 5 }
  }

  return { message, currentStep: 0, totalSteps: 0 }
})

const displayMessage = computed(() => phaseInfo.value?.message || normalizedMessage.value || t('parse.waiting'))

const formattedScanned = computed(() => {
  if (typeof props.scannedMessages !== 'number' || props.scannedMessages <= 0) {
    return null
  }

  return formatNumber(props.scannedMessages)
})

const completedChats = computed(() => {
  if (props.status === 'completed') {
    return props.total
  }

  if (!props.total) {
    return 0
  }

  return Math.max(0, props.current - (props.status === 'running' ? 1 : 0))
})

const activeChatIndex = computed(() => {
  if (!props.total) {
    return 0
  }

  return Math.min(Math.max(props.current, 0), props.total)
})

const phaseSummary = computed(() => {
  if (!phaseInfo.value?.totalSteps) {
    return null
  }

  return t('parse.stepSummary', {
    current: formatNumber(phaseInfo.value.currentStep),
    total: formatNumber(phaseInfo.value.totalSteps),
  })
})

const phaseFraction = computed(() => {
  switch (props.phase) {
    case 'queued':
      return 0.03
    case 'connecting':
    case 'retrying':
      return 0.1
    case 'loading-dialogs':
      return 0.2
    case 'scanning':
      return 0.45
    case 'saving':
      return 0.92
    default:
      return props.status === 'pending' ? 0.03 : 0
  }
})

const isIndeterminate = computed(() => props.status === 'running' && !props.phase && !props.total)

const progressPercent = computed(() => {
  if (props.status === 'completed') {
    return 100
  }

  if (props.total <= 1) {
    return Math.round(phaseFraction.value * 100)
  }

  return Math.min(99, Math.round(((completedChats.value + phaseFraction.value) / props.total) * 100))
})

const progressLabel = computed(() => {
  if (props.status === 'completed') {
    return '100%'
  }

  return `${progressPercent.value}%`
})

const progressSummary = computed(() => {
  if (!props.total || props.total <= 1) {
    return null
  }

  return t('parse.chatSummary', {
    current: formatNumber(activeChatIndex.value),
    total: formatNumber(props.total),
  })
})

const estimatedTimeRemaining = computed(() => {
  if (!props.startTime || !props.total || props.status !== 'running') {
    return null
  }

  const elapsed = elapsedSeconds.value
  if (elapsed < 5) {
    return null
  }

  const progress = completedChats.value / props.total
  if (progress <= 0) {
    return null
  }

  const totalEstimated = elapsed / progress
  const remaining = Math.max(0, totalEstimated - elapsed)

  if (remaining < 5) {
    return null
  }

  const minutes = Math.floor(remaining / 60)
  const seconds = Math.floor(remaining % 60)

  if (minutes > 0) {
    return t('common.durationMinutes', { minutes, seconds })
  }

  return t('common.durationSeconds', { seconds })
})

const elapsedTime = computed(() => {
  if (!elapsedSeconds.value || (props.status !== 'running' && props.status !== 'pending')) {
    return null
  }

  const minutes = Math.floor(elapsedSeconds.value / 60)
  const seconds = elapsedSeconds.value % 60

  if (minutes > 0) {
    return t('common.durationMinutes', { minutes, seconds })
  }

  return t('common.durationSeconds', { seconds })
})

const currentPhaseStep = computed(() => Math.max(1, phaseInfo.value?.currentStep || 1))
const compactTitle = computed(() => t('parse.analysisTitle', { name: props.chatName || t('common.telegram') }))
const compactSubtitle = computed(() =>
  t('parse.compactSummary', {
    current: formatNumber(currentPhaseStep.value),
    total: formatNumber(5),
    status: displayMessage.value,
    seconds: formatNumber(elapsedSeconds.value),
  }),
)

const scannedLabel = computed(() => {
  if (!formattedScanned.value) {
    return null
  }

  return t('parse.messagesProcessed', { count: formattedScanned.value })
})

const isScanningPhase = computed(() => props.phase === 'scanning' || isScanningMessage.value)

const titleText = computed(() => (isScanningPhase.value ? displayMessage.value : t('parse.title')))

const subtitleText = computed(() => {
  if (isScanningPhase.value && scannedLabel.value) {
    return scannedLabel.value
  }

  return displayMessage.value
})

onMounted(() => {
  if (props.startTime) {
    elapsedSeconds.value = Math.max(0, Math.floor((Date.now() - props.startTime) / 1000))
  }

  timer = window.setInterval(() => {
    if (props.status === 'running' || props.status === 'pending') {
      elapsedSeconds.value = props.startTime
        ? Math.max(0, Math.floor((Date.now() - props.startTime) / 1000))
        : elapsedSeconds.value + 1
    }
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<template>
  <section class="progress-card animate-fade-in-down" :class="{ 'progress-card-compact': compact }">
    <div class="progress-header">
      <div class="progress-copy">
        <div class="progress-title-row">
          <h3 class="t-h3">{{ compact ? compactTitle : titleText }}</h3>
        </div>
        <p class="t-small progress-message">{{ compact ? compactSubtitle : subtitleText }}</p>
      </div>
      <IconButton
        v-if="cancellable"
        class="cancel-button"
        :icon="Square"
        :label="cancelling ? t('dashboard.cancelling') : t('dashboard.cancelParse')"
        variant="danger"
        size="sm"
        :disabled="cancelling"
        @click="emit('cancel')"
      />
    </div>

    <div
      v-if="!compact"
      class="progress-bar"
      role="progressbar"
      :aria-label="t('parse.title')"
      :aria-valuenow="isIndeterminate ? undefined : progressPercent"
      :aria-valuemin="0"
      :aria-valuemax="100"
      :aria-valuetext="subtitleText"
      :class="{ 'progress-bar-indeterminate': isIndeterminate, 'progress-bar-active': status === 'running' }"
    >
      <div class="progress-bar-fill" :style="{ width: `${progressPercent}%` }" />
    </div>

    <div
      v-else
      class="phase-progress"
      role="progressbar"
      :aria-label="t('parse.title')"
      :aria-valuenow="currentPhaseStep"
      aria-valuemin="1"
      aria-valuemax="5"
    >
      <span
        v-for="phaseStep in 5"
        :key="phaseStep"
        :class="{ complete: phaseStep < currentPhaseStep, active: phaseStep === currentPhaseStep }"
      />
    </div>

    <div v-if="!compact" class="progress-meta t-small">
      <div class="meta-left">
        <p v-if="progressSummary" class="t-mono">{{ progressSummary }}</p>
        <p v-if="phaseSummary" class="progress-phase">{{ phaseSummary }}</p>
        <p v-if="chatName" class="progress-chat">{{ chatName }}</p>
      </div>
      <div class="meta-right">
        <p v-if="progressLabel" class="progress-percent t-metric-sm">{{ progressLabel }}</p>
        <p v-if="scannedLabel && !isScanningPhase" class="scanned-count">{{ scannedLabel }}</p>
        <p v-if="estimatedTimeRemaining" class="estimated-time">~{{ estimatedTimeRemaining }}</p>
        <p v-else-if="elapsedTime" class="estimated-time">{{ t('parse.elapsed', { time: elapsedTime }) }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.progress-card {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-5);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  box-shadow: none;
}

.progress-card-compact {
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--bg-surface) 92%, var(--bg-elevated));
}

.progress-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.progress-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.progress-title-row {
  display: flex;
  align-items: center;
  min-width: 0;
}

.t-h3 {
  min-width: 0;
}

.progress-message {
  overflow-wrap: anywhere;
  color: var(--text-secondary);
  line-height: 1.35;
}

.progress-card-compact .t-label {
  display: none;
}

.progress-card-compact .t-h3 {
  font-size: 15px;
}

.progress-card-compact .progress-message {
  font-size: 12px;
}

.phase-progress {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
}

.phase-progress span {
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--bg-overlay);
}

.phase-progress span.complete {
  background: var(--accent);
}

.phase-progress span.active {
  background: var(--status-running);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--status-running) 16%, transparent);
}

.cancel-button {
  width: 36px;
  min-width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  color: var(--danger);
}

.progress-bar {
  position: relative;
  overflow: hidden;
  height: 4px;
  margin-block: var(--space-2);
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--bg-overlay) 88%, var(--border-default));
}

.progress-bar-fill {
  position: relative;
  height: 100%;
  min-width: 12px;
  border-radius: inherit;
  background: var(--status-running);
  transition: width var(--transition-normal);
}

.progress-bar-active .progress-bar-fill::after {
  position: absolute;
  inset: 0;
  content: '';
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 32%), transparent);
  transform: translateX(-100%);
  animation: progress-sheen 1.8s ease-in-out infinite;
}

.progress-bar-indeterminate .progress-bar-fill {
  width: 36% !important;
  animation: progress-indeterminate 1.35s ease-in-out infinite;
}

.progress-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
}

.meta-left,
.meta-right {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.meta-right {
  text-align: right;
  align-items: flex-end;
  min-width: fit-content;
}

.progress-percent {
  color: var(--text-primary);
}

.progress-ratio,
.progress-phase {
  color: var(--text-secondary);
}

.scanned-count {
  color: var(--text-primary);
  font-weight: 500;
  overflow-wrap: anywhere;
}

.estimated-time {
  color: var(--text-tertiary);
}

.progress-chat {
  color: var(--text-secondary);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes progress-indeterminate {
  0% {
    transform: translateX(-120%);
  }

  100% {
    transform: translateX(320%);
  }
}

@keyframes progress-sheen {
  to {
    transform: translateX(100%);
  }
}

@media (max-width: 640px) {
  .progress-meta {
    flex-direction: column;
    align-items: stretch;
  }

  .meta-right {
    align-items: flex-start;
    text-align: left;
  }

  .mobile-topbar-progress .progress-header {
    flex-direction: row;
    align-items: flex-start;
    justify-content: space-between;
  }

  .mobile-topbar-progress .progress-meta {
    flex-direction: row;
    align-items: center;
  }

  .mobile-topbar-progress .cancel-button {
    align-self: flex-start;
    margin-left: auto;
  }
}

@media (prefers-reduced-motion: reduce) {
  .progress-bar-indeterminate .progress-bar-fill {
    animation: none;
    width: 100% !important;
    opacity: 0.45;
  }

  .progress-bar-active .progress-bar-fill::after {
    animation: none;
  }
}

.mobile-topbar-progress.progress-card {
  gap: 6px;
  padding: 8px 10px;
  border-radius: 10px;
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--bg-elevated) 96%, transparent);
  box-shadow: none;
}

.mobile-topbar-progress .t-label,
.mobile-topbar-progress .progress-phase,
.mobile-topbar-progress .progress-chat,
.mobile-topbar-progress .estimated-time {
  display: none;
}

.mobile-topbar-progress .progress-header {
  gap: var(--space-2);
}

.mobile-topbar-progress .progress-copy {
  gap: 1px;
}

.mobile-topbar-progress .progress-title-row {
  gap: var(--space-2);
  margin-bottom: 2px;
}

.mobile-topbar-progress .t-h3 {
  font-size: 12px;
  line-height: 1.15;
}

.mobile-topbar-progress .progress-message {
  font-size: 11px;
  line-height: 1.2;
  color: var(--text-secondary);
}

.mobile-topbar-progress .progress-bar {
  height: 4px;
  margin-block: 2px;
}

.mobile-topbar-progress .progress-meta {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.mobile-topbar-progress .meta-left,
.mobile-topbar-progress .meta-right {
  flex-direction: row;
  align-items: center;
  gap: var(--space-2);
}

.mobile-topbar-progress .meta-right {
  margin-left: auto;
  text-align: right;
}

.mobile-topbar-progress .progress-percent,
.mobile-topbar-progress .scanned-count,
.mobile-topbar-progress .t-mono {
  font-size: 11px;
  line-height: 1.1;
}
</style>

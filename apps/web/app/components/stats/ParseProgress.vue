<script setup lang="ts">
import { Square } from '../../lib/icons'

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
}>()

const emit = defineEmits<{ cancel: [] }>()
const { t, formatNumber } = useI18n()

const elapsedSeconds = ref(0)
let timer: number | null = null

const normalizedMessage = computed(() => props.message?.trim() ?? '')
const isScanningMessage = computed(() => /^Scanning\s+[\d,\s]+\s+messages$/i.test(normalizedMessage.value))

const phaseInfo = computed(() => {
  if (props.status === 'pending') {
    return {
      message: t('parse.waiting'),
      currentStep: 1,
      totalSteps: 4,
    }
  }

  const message = normalizedMessage.value
  if (!message) {
    return null
  }

  if (/^Connecting to Telegram$/i.test(message)) {
    return { message: t('parse.connecting'), currentStep: 1, totalSteps: 4 }
  }

  if (/^Loading chat list$/i.test(message)) {
    return { message: t('parse.loadingChats'), currentStep: 2, totalSteps: 4 }
  }

  if (/^Starting message scan$/i.test(message)) {
    return { message: t('parse.preparingScan'), currentStep: 3, totalSteps: 4 }
  }

  if (isScanningMessage.value) {
    return { message: t('parse.scanningMessages'), currentStep: 4, totalSteps: 4 }
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

const isIndeterminate = computed(() => props.status === 'running' && props.total <= 1)

const progressPercent = computed(() => {
  if (props.status === 'completed') {
    return 100
  }

  if (!props.total) {
    return 0
  }

  if (props.total <= 1) {
    return 0
  }

  return Math.round((completedChats.value / props.total) * 100)
})

const progressLabel = computed(() => {
  if (props.status === 'completed') {
    return '100%'
  }

  if (props.total <= 1) {
    return null
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

  const elapsed = (Date.now() - props.startTime) / 1000
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

const scannedLabel = computed(() => {
  if (!formattedScanned.value) {
    return null
  }

  return t('parse.messagesProcessed', { count: formattedScanned.value })
})

const isScanningPhase = computed(() => phaseInfo.value?.currentStep === 4 || isScanningMessage.value)

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
  <section
    class="progress-card animate-fade-in-down"
    :class="{ 'progress-card-compact': compact }"
  >
    <div class="progress-header">
      <div class="progress-copy">
        <div class="text-label">{{ t('parse.label') }}</div>
        <div class="progress-title-row">
          <h3 class="text-h3">{{ titleText }}</h3>
        </div>
        <p class="text-body-sm progress-message">{{ subtitleText }}</p>
      </div>
      <button
        v-if="cancellable"
        class="cancel-button cancel-button-icon"
        type="button"
        :disabled="cancelling"
        :aria-label="cancelling ? t('dashboard.cancelling') : t('dashboard.cancelParse')"
        :title="cancelling ? t('dashboard.cancelling') : t('dashboard.cancelParse')"
        @click="emit('cancel')"
      >
        <Square />
      </button>
    </div>

    <div class="progress-bar" :class="{ 'progress-bar-indeterminate': isIndeterminate }">
      <div class="progress-bar-fill" :style="{ width: `${progressPercent}%` }" />
    </div>

    <div class="progress-meta text-body-sm">
      <div class="meta-left">
        <p v-if="progressSummary" class="mono-value">{{ progressSummary }}</p>
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
  gap: 4px;
  min-width: 0;
}

.progress-title-row {
  display: flex;
  align-items: center;
  min-width: 0;
}

.text-h3 {
  min-width: 0;
}

.progress-message {
  color: var(--text-secondary);
  line-height: 1.35;
}

.progress-card-compact .text-label {
  display: none;
}

.progress-card-compact .text-h3 {
  font-size: 15px;
}

.progress-card-compact .progress-message {
  font-size: 12px;
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
  height: 100%;
  min-width: 12px;
  border-radius: inherit;
  background: var(--status-running);
  transition: width var(--transition-normal);
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

.progress-card:not(.mobile-topbar-progress) .progress-chat {
  display: none;
}

.cancel-button {
  min-height: 44px;
  padding: 0 var(--space-3);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}

.cancel-button svg {
  width: 14px;
  height: 14px;
  stroke-width: 1.8;
}

.cancel-button-icon {
  width: 36px;
  min-width: 36px;
  min-height: 36px;
  padding: 0;
  align-items: center;
  justify-content: center;
  display: inline-flex;
  border-color: var(--border-subtle);
  background: var(--bg-elevated);
  color: var(--text-secondary);
}

.cancel-button:hover {
  border-color: rgba(248, 113, 113, 0.2);
  background: var(--danger-subtle);
  color: var(--danger);
}

.cancel-button:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--accent), 0 0 0 3px var(--bg-base);
}

.cancel-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes progress-indeterminate {
  0% {
    transform: translateX(-120%);
  }

  100% {
    transform: translateX(320%);
  }
}

@media (max-width: 640px) {
  .progress-header,
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

  .mobile-topbar-progress .cancel-button-icon {
    align-self: flex-start;
    margin-left: auto;
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

.mobile-topbar-progress .text-label,
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

.mobile-topbar-progress .text-h3 {
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
.mobile-topbar-progress .mono-value {
  font-size: 11px;
  line-height: 1.1;
}

.mobile-topbar-progress .cancel-button-icon {
  width: 28px;
  min-width: 28px;
  min-height: 28px;
}

.mobile-topbar-progress .cancel-button svg {
  width: 12px;
  height: 12px;
}
</style>

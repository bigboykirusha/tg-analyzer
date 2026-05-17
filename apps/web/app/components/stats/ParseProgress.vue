<script setup lang="ts">
import StatusDot from '../ui/StatusDot.vue'

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
  mobileFloating?: boolean
}>()

const emit = defineEmits<{ cancel: [] }>()
const { t, formatNumber } = useI18n()

const elapsedSeconds = ref(0)
let timer: number | null = null

const normalizedMessage = computed(() => props.message?.trim() ?? '')
const showChatProgress = computed(() => props.total > 1)
const isScanningMessage = computed(() => /^Scanning\s+[\d,\s]+\s+messages$/i.test(normalizedMessage.value))

const phaseInfo = computed(() => {
  if (props.status === 'pending') {
    return {
      message: t('parse.waiting'),
      currentStep: 1,
      totalSteps: 4,
      progress: 8,
    }
  }

  const message = normalizedMessage.value
  if (!message) {
    return null
  }

  if (/^Connecting to Telegram$/i.test(message)) {
    return { message: t('parse.connecting'), currentStep: 1, totalSteps: 4, progress: 18 }
  }

  if (/^Loading chat list$/i.test(message)) {
    return { message: t('parse.loadingChats'), currentStep: 2, totalSteps: 4, progress: 34 }
  }

  if (/^Starting message scan$/i.test(message)) {
    return { message: t('parse.preparingScan'), currentStep: 3, totalSteps: 4, progress: 52 }
  }

  if (isScanningMessage.value) {
    return { message: t('parse.scanningMessages'), currentStep: 4, totalSteps: 4, progress: 76 }
  }

  return { message, currentStep: 0, totalSteps: 0, progress: 0 }
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

const phaseSummary = computed(() => {
  if (showChatProgress.value || !phaseInfo.value?.totalSteps) {
    return null
  }

  return t('parse.stepSummary', {
    current: formatNumber(phaseInfo.value.currentStep),
    total: formatNumber(phaseInfo.value.totalSteps),
  })
})

const isIndeterminate = computed(() =>
  props.status === 'running' && !showChatProgress.value && !(phaseInfo.value?.progress && phaseInfo.value.progress > 0),
)

const progressPercent = computed(() => {
  if (props.status === 'completed') {
    return 100
  }

  if (!showChatProgress.value) {
    return phaseInfo.value?.progress ?? 0
  }

  if (!props.total) {
    return 0
  }

  return Math.round((completedChats.value / props.total) * 100)
})

const progressLabel = computed(() => {
  if (props.status === 'completed') {
    return '100%'
  }

  if (!showChatProgress.value || !props.total) {
    return null
  }

  return `${progressPercent.value}%`
})

const progressSummary = computed(() => {
  if (!showChatProgress.value) {
    return null
  }

  const currentChat = Math.min(Math.max(props.current, 1), props.total)
  return t('parse.chatSummary', {
    current: formatNumber(currentChat),
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

function statusLabel(status: string) {
  if (status === 'completed') return t('common.statusCompleted')
  if (status === 'failed') return t('common.statusFailed')
  if (status === 'cancelled') return t('common.statusCancelled')
  if (status === 'running') return t('common.statusRunning')
  if (status === 'pending') return t('common.statusPending')
  return status
}

function statusVariant(status: string) {
  if (status === 'completed') return 'completed'
  if (status === 'failed') return 'failed'
  if (status === 'cancelled') return 'cancelled'
  if (status === 'running') return 'running'
  if (status === 'pending') return 'pending'
  return 'inactive'
}
</script>

<template>
  <section
    class="progress-card animate-fade-in-down"
    :class="{ 'progress-card-compact': compact, 'progress-card-mobile-floating': mobileFloating }"
  >
    <div class="progress-header">
      <div class="progress-copy">
        <div class="text-label">{{ t('parse.label') }}</div>
        <div class="progress-title-row">
          <h3 class="text-h3">{{ t('parse.title') }}</h3>
          <StatusDot :variant="statusVariant(status)" :label="statusLabel(status)" />
        </div>
        <p class="text-body-sm progress-message">{{ displayMessage }}</p>
      </div>
      <button v-if="cancellable" class="cancel-button" type="button" :disabled="cancelling" @click="emit('cancel')">
        {{ cancelling ? t('dashboard.cancelling') : t('dashboard.cancelParse') }}
      </button>
    </div>

    <div class="progress-bar" :class="{ 'progress-bar-indeterminate': isIndeterminate }">
      <div class="progress-bar-fill" :style="{ width: `${progressPercent}%` }" />
    </div>

    <div class="progress-meta text-body-sm">
      <div class="meta-left">
        <p v-if="progressSummary" class="mono-value">{{ progressSummary }}</p>
        <p v-else-if="phaseSummary" class="mono-value">{{ phaseSummary }}</p>
        <p v-if="chatName" class="progress-chat">{{ chatName }}</p>
      </div>
      <div class="meta-right">
        <p v-if="progressLabel" class="progress-percent t-metric-sm">{{ progressLabel }}</p>
        <p v-if="scannedLabel" class="scanned-count">{{ scannedLabel }}</p>
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
  gap: var(--space-4);
  padding: var(--space-5);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-elevated) 100%);
}

.progress-card-compact {
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
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
  justify-content: space-between;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.progress-message {
  color: var(--text-secondary);
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
  height: 3px;
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
  align-items: flex-end;
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
}

.progress-percent {
  color: var(--text-primary);
}

.scanned-count {
  color: var(--text-primary);
  font-weight: 500;
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

  .progress-card-mobile-floating {
    position: fixed;
    left: var(--space-3);
    right: var(--space-3);
    bottom: calc(var(--space-3) + env(safe-area-inset-bottom, 0px));
    z-index: 30;
    gap: 8px;
    padding: 12px;
    border-radius: 14px;
    border-color: var(--border-strong);
    background: var(--panel-translucent-strong);
    backdrop-filter: blur(16px);
    box-shadow: var(--shadow-lg);
  }

  .progress-card-mobile-floating .text-label,
  .progress-card-mobile-floating .progress-meta,
  .progress-card-mobile-floating .progress-chat {
    display: none;
  }

  .progress-card-mobile-floating .progress-copy {
    gap: 2px;
  }

  .progress-card-mobile-floating .progress-title-row {
    display: none;
  }

  .progress-card-mobile-floating .text-h3 {
    font-size: 14px;
    line-height: 1.2;
  }

  .progress-card-mobile-floating .progress-message {
    font-size: 14px;
    line-height: 1.3;
  }

  .progress-card-mobile-floating .progress-bar {
    height: 6px;
  }

  .progress-card-mobile-floating .cancel-button {
    min-height: 36px;
    align-self: flex-start;
    padding: 0 12px;
    font-size: 13px;
  }
}
</style>

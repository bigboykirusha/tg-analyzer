<script setup lang="ts">
import Badge from '../ui/Badge.vue'

defineProps<{
  current: number
  total: number
  chatName: string
  status: string
  message?: string
  cancellable?: boolean
  cancelling?: boolean
}>()

const emit = defineEmits<{ cancel: [] }>()
const { t, formatNumber } = useI18n()

function statusLabel(status: string) {
  if (status === 'completed') {
    return t('common.statusCompleted')
  }
  if (status === 'failed') {
    return t('common.statusFailed')
  }
  if (status === 'cancelled') {
    return t('common.statusCancelled')
  }
  if (status === 'running') {
    return t('common.statusRunning')
  }
  if (status === 'pending') {
    return t('common.statusPending')
  }
  return status
}
</script>

<template>
  <section class="progress-card animate-fade-in-down">
    <div class="progress-header">
      <div class="progress-copy">
        <div class="text-label">{{ t('parse.label') }}</div>
        <h3 class="text-h3">{{ t('parse.title') }}</h3>
        <p class="text-body-sm progress-message">{{ message || t('parse.waiting') }}</p>
      </div>
      <Badge :variant="status === 'completed' ? 'success' : status === 'failed' ? 'danger' : status === 'cancelled' ? 'warning' : status === 'running' ? 'info' : 'default'">
        {{ statusLabel(status) }}
      </Badge>
    </div>

    <div class="progress-bar">
      <div class="progress-bar-fill" :style="{ width: total ? `${Math.round((current / total) * 100)}%` : '0%' }" />
    </div>

    <div class="progress-meta text-body-sm">
      <p class="mono-value">{{ formatNumber(current) }} / {{ total ? formatNumber(total) : '...' }}</p>
      <p v-if="chatName" class="progress-chat">{{ chatName }}</p>
    </div>

    <div v-if="cancellable" class="progress-actions">
      <button class="cancel-button" type="button" :disabled="cancelling" @click="emit('cancel')">
        {{ cancelling ? t('dashboard.cancelling') : t('dashboard.cancelParse') }}
      </button>
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
  background:
    linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-elevated) 100%);
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
}

.progress-message {
  color: var(--text-secondary);
}

.progress-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--text-secondary);
}

.progress-chat {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-actions {
  display: flex;
  justify-content: flex-end;
}

.cancel-button {
  min-height: 34px;
  padding: 0 var(--space-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
}

.cancel-button:hover {
  border-color: var(--border-strong);
  background: var(--bg-overlay);
  color: var(--text-primary);
}

.cancel-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .progress-header,
  .progress-meta,
  .progress-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

<script setup lang="ts">
import type { ParseHistoryItem } from '@tg-analyzer/shared'
import AppLayout from '../components/AppLayout.vue'
import Container from '../components/layout/Container.vue'
import ParseProgress from '../components/stats/ParseProgress.vue'
import Badge from '../components/ui/Badge.vue'
import Button from '../components/ui/Button.vue'
import ConfirmDialog from '../components/ui/ConfirmDialog.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import Skeleton from '../components/ui/Skeleton.vue'
import StatusDot from '../components/ui/StatusDot.vue'
import { Clock, Trash2, X } from '../lib/icons'
import { useI18n } from '../composables/useI18n'
import { useParseProgress } from '../composables/useParseProgress'
import { useStats } from '../composables/useStats'
import { useToast } from '../composables/useToast'
import authMiddleware from '../middleware/auth'
import { useStatsStore } from '../stores/stats'

definePageMeta({
  middleware: [authMiddleware],
})

const { fetchHistory, clearHistory, deleteHistoryItem } = useStats()
const stats = useStatsStore()
const { progress, bootstrapped, bootstrapFromServer, connect, disconnect } = useParseProgress()
const { t, formatNumber, formatDate: formatLocaleDate } = useI18n()
const toast = useToast()
const historyPageSize = 20
const historyPage = ref(1)
const historyTotal = ref(0)
const loadingHistoryPage = ref(false)
const historyPageCount = computed(() => Math.max(1, Math.ceil(historyTotal.value / historyPageSize)))

const ready = ref(false)
const clearingHistory = ref(false)
const deletingHistoryJobId = ref<string | null>(null)
const selectedHistoryItem = ref<ParseHistoryItem | null>(null)
const confirmState = ref<{
  type: 'clear-history' | 'delete-history-item'
  title: string
  description: string
  confirmLabel: string
  jobId?: string
} | null>(null)

const isParseActive = computed(() => progress.value.status === 'running' || progress.value.status === 'pending')
const isParseTerminal = computed(() => ['completed', 'failed', 'cancelled'].includes(progress.value.status))

function formatShortDate(value: string | null) {
  if (!value) {
    return t('common.na')
  }

  return formatLocaleDate(value, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatHistoryDates(item: ParseHistoryItem) {
  return formatShortDate(item.createdAt)
}

function formatCompletedDate(value: string | null) {
  if (!value) {
    return t('common.na')
  }

  return formatShortDate(value)
}

function formatCooldown(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours) {
    return t('common.durationHours', { hours, minutes })
  }
  if (minutes) {
    return t('common.durationMinutes', { minutes, seconds: remainingSeconds })
  }
  return t('common.durationSeconds', { seconds: remainingSeconds })
}

function historyDuration(item: ParseHistoryItem) {
  const startedAt = new Date(item.createdAt).getTime()
  const finishedAt = item.completedAt ? new Date(item.completedAt).getTime() : Date.now()

  if (Number.isNaN(startedAt) || Number.isNaN(finishedAt) || finishedAt <= startedAt) {
    return t('common.na')
  }

  return formatCooldown(Math.round((finishedAt - startedAt) / 1000))
}

function historyProgress(item: ParseHistoryItem) {
  if (item.status === 'completed') {
    return 100
  }
  if (item.totalChats > 0) {
    return Math.round((item.parsedChats / item.totalChats) * 100)
  }
  if (item.status === 'running') {
    return item.totalMessages ? 55 : 12
  }
  if (item.status === 'pending') {
    return 6
  }
  if (item.status === 'failed' || item.status === 'cancelled') {
    return item.totalMessages ? 100 : 18
  }
  return 0
}

function statusVariant(status: string) {
  if (status === 'completed') {
    return 'success'
  }
  if (status === 'failed') {
    return 'danger'
  }
  if (status === 'cancelled') {
    return 'warning'
  }
  if (status === 'running') {
    return 'info'
  }
  return 'default'
}

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

function formatHistoryScope(item: ParseHistoryItem) {
  if (item.totalChats > 1) {
    return `${formatNumber(item.parsedChats)} / ${formatNumber(item.totalChats)}`
  }
  if (item.chatName) {
    return item.chatName
  }
  return item.jobId
}

function shouldRenderHistoryError(item: ParseHistoryItem) {
  if (!item.errorMessage) {
    return false
  }

  return !/busy with another operation|transient duplicate-auth conflict/i.test(item.errorMessage)
}

function openHistoryDetails(item: ParseHistoryItem) {
  selectedHistoryItem.value = item
}

function closeHistoryDetails() {
  selectedHistoryItem.value = null
}

async function loadHistoryPage(page: number) {
  loadingHistoryPage.value = true
  try {
    const result = await fetchHistory(page, historyPageSize)
    historyPage.value = result.page
    historyTotal.value = result.total
    return result
  } finally {
    loadingHistoryPage.value = false
  }
}

function openClearHistoryConfirm() {
  confirmState.value = {
    type: 'clear-history',
    title: t('dashboard.clearHistory'),
    description: t('dashboard.clearHistoryConfirm'),
    confirmLabel: t('dashboard.clearHistory'),
  }
}

function openDeleteHistoryItemConfirm(jobId: string) {
  confirmState.value = {
    type: 'delete-history-item',
    title: t('dashboard.deleteHistoryItem'),
    description: t('dashboard.deleteHistoryItemConfirm'),
    confirmLabel: t('dashboard.deleteHistoryItem'),
    jobId,
  }
}

async function handleClearHistory() {
  clearingHistory.value = true

  try {
    await clearHistory()
    await loadHistoryPage(historyPage.value)
    toast.success(t('dashboard.historyCleared'))
  } catch (error) {
    toast.error(error instanceof Error ? error.message : t('dashboard.clearHistoryError'))
  } finally {
    clearingHistory.value = false
    confirmState.value = null
  }
}

async function handleDeleteHistoryItem(jobId: string) {
  deletingHistoryJobId.value = jobId

  try {
    await deleteHistoryItem(jobId)
    const result = await loadHistoryPage(historyPage.value)
    if (!result.items.length && historyPage.value > 1) {
      await loadHistoryPage(historyPage.value - 1)
    }
    toast.success(t('dashboard.historyItemDeleted'))
  } catch (error) {
    toast.error(error instanceof Error ? error.message : t('dashboard.deleteHistoryItemError'))
  } finally {
    deletingHistoryJobId.value = null
    confirmState.value = null
  }
}

async function confirmAction() {
  if (!confirmState.value) {
    return
  }

  if (confirmState.value.type === 'clear-history') {
    await handleClearHistory()
  } else if (confirmState.value.type === 'delete-history-item' && confirmState.value.jobId) {
    await handleDeleteHistoryItem(confirmState.value.jobId)
  }
}

const confirmLoading = computed(() => {
  if (!confirmState.value) {
    return false
  }
  if (confirmState.value.type === 'delete-history-item') {
    return deletingHistoryJobId.value === confirmState.value.jobId
  }
  return clearingHistory.value
})

watch(isParseActive, (active) => {
  if (!bootstrapped.value) {
    return
  }

  if (active) {
    connect()
    return
  }

  disconnect()
})

watch(isParseTerminal, async (terminal) => {
  if (!bootstrapped.value || !terminal) {
    return
  }

  disconnect()
  await loadHistoryPage(historyPage.value).catch(() => undefined)
})

onBeforeUnmount(() => {
  disconnect()
})

onMounted(async () => {
  try {
    await bootstrapFromServer().catch(() => undefined)
    await loadHistoryPage(1)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : t('dashboard.loadStatsError'))
  } finally {
    ready.value = true
  }
})
</script>

<template>
  <AppLayout>
    <Container size="default">
      <div v-if="!ready" class="page-stack">
        <section class="card workspace-card">
          <div class="stack-md">
            <Skeleton height="24px" width="180px" />
            <div class="list-grid">
              <Skeleton v-for="item in 5" :key="`history-${item}`" height="96px" radius="var(--radius-md)" />
            </div>
          </div>
        </section>
      </div>

      <div v-else class="page-stack" :class="{ 'page-stack-with-mobile-toast': isParseActive }">
        <ParseProgress
          v-if="isParseActive"
          class="dashboard-progress-inline"
          compact
          :current="progress.current"
          :total="progress.total"
          :chat-name="progress.chatName"
          :status="progress.status"
          :message="progress.message"
          :scanned-messages="progress.scannedMessages"
          :start-time="progress.startTime"
        />

        <section class="card section-card workspace-card">
          <div class="section-header">
            <div class="section-copy">
              <span class="t-label">{{ t('dashboard.runHistoryLabel') }}</span>
              <div class="section-title-row">
                <h1 class="t-h2">{{ t('dashboard.historyPageTitle') }}</h1>
                <Badge variant="accent">{{ t('dashboard.jobsCount', { count: formatNumber(historyTotal) }) }}</Badge>
              </div>
              <p class="t-small section-text">{{ t('dashboard.historyPageText') }}</p>
            </div>
          </div>

          <div v-if="stats.history.length" class="history-layout">
            <div class="history-list">
              <div
                v-for="(item, index) in stats.history"
                :key="item.jobId"
                class="history-row stagger-item"
                :style="{ '--delay': `${index * 30}ms` }"
                role="button"
                tabindex="0"
                @click="openHistoryDetails(item)"
                @keydown.enter.prevent="openHistoryDetails(item)"
                @keydown.space.prevent="openHistoryDetails(item)"
              >
                <div class="history-main">
                  <div class="dialog-copy">
                    <div class="dialog-title-row">
                      <span class="history-title">{{ formatHistoryScope(item) }}</span>
                      <StatusDot :variant="statusVariant(item.status)" :label="statusLabel(item.status)" />
                    </div>
                    <div class="history-meta t-small">
                      <span class="selection-subline">{{ formatHistoryDates(item) }}</span>
                    </div>
                  </div>
                  <Button
                    v-if="item.status !== 'running' && item.status !== 'pending'"
                    variant="ghost"
                    size="sm"
                    class="delete-btn"
                    :icon="Trash2"
                    aria-label="Delete"
                    :loading="deletingHistoryJobId === item.jobId"
                    @click.stop="openDeleteHistoryItemConfirm(item.jobId)"
                  />
                </div>
                <div v-if="shouldRenderHistoryError(item)" class="detail-error t-small">
                  {{ item.errorMessage }}
                </div>
                <div v-else-if="item.status === 'running' || item.status === 'pending'" class="history-progress progress-bar">
                  <div class="progress-bar-fill" :style="{ width: `${historyProgress(item)}%` }" />
                </div>
              </div>
            </div>
          </div>

          <EmptyState
            v-else
            :icon="Clock"
            :title="t('dashboard.noJobsTitle')"
            :description="t('dashboard.noJobsDescription')"
          />

          <nav
            v-if="historyTotal > historyPageSize"
            class="history-pagination"
            :aria-label="t('dashboard.historyPagination')"
            aria-live="polite"
          >
            <Button
              variant="secondary"
              size="sm"
              :disabled="loadingHistoryPage || historyPage <= 1"
              @click="loadHistoryPage(historyPage - 1)"
            >
              {{ t('common.previousPage') }}
            </Button>
            <span class="t-small">{{ t('common.pageOf', { page: formatNumber(historyPage), total: formatNumber(historyPageCount) }) }}</span>
            <Button
              variant="secondary"
              size="sm"
              :disabled="loadingHistoryPage || historyPage >= historyPageCount"
              @click="loadHistoryPage(historyPage + 1)"
            >
              {{ t('common.nextPage') }}
            </Button>
          </nav>

          <div v-if="stats.history.length" class="history-actions-footer">
            <Button variant="secondary" size="md" class="history-clear-button" :loading="clearingHistory" @click="openClearHistoryConfirm">
              {{ t('dashboard.clearHistory') }}
            </Button>
          </div>
        </section>

        <ConfirmDialog
          :open="Boolean(confirmState)"
          :title="confirmState?.title ?? ''"
          :description="confirmState?.description ?? ''"
          :confirm-label="confirmState?.confirmLabel ?? ''"
          :cancel-label="t('common.cancel')"
          variant="danger"
          :loading="confirmLoading"
          @close="confirmState = null"
          @confirm="confirmAction"
        />

        <Teleport to="body">
          <Transition name="dialog">
            <div v-if="selectedHistoryItem" class="dialog-backdrop" @click.self="closeHistoryDetails">
              <section class="dialog-panel history-dialog-panel" role="dialog" aria-modal="true">
                <button type="button" class="dialog-close" :aria-label="t('common.close')" @click="closeHistoryDetails">
                  <X :size="18" :stroke-width="1.5" aria-hidden="true" />
                </button>
                <div class="history-dialog-copy">
                  <div class="section-title-row">
                    <h2 class="t-h3">{{ formatHistoryScope(selectedHistoryItem) }}</h2>
                    <Badge :variant="statusVariant(selectedHistoryItem.status)">{{ statusLabel(selectedHistoryItem.status) }}</Badge>
                  </div>
                  <p class="t-small">{{ selectedHistoryItem.chatName || selectedHistoryItem.chatId || selectedHistoryItem.jobId }}</p>
                </div>

                <div class="history-dialog-grid">
                  <div class="history-dialog-item">
                    <span class="t-label">{{ t('dashboard.started') }}</span>
                    <span class="t-mono">{{ formatShortDate(selectedHistoryItem.createdAt) }}</span>
                  </div>
                  <div class="history-dialog-item">
                    <span class="t-label">{{ t('dashboard.finished') }}</span>
                    <span class="t-mono">{{ formatCompletedDate(selectedHistoryItem.completedAt) }}</span>
                  </div>
                  <div class="history-dialog-item">
                    <span class="t-label">{{ t('dashboard.duration') }}</span>
                    <span class="t-mono">{{ historyDuration(selectedHistoryItem) }}</span>
                  </div>
                  <div class="history-dialog-item">
                    <span class="t-label">{{ t('dashboard.progress') }}</span>
                    <span class="t-mono">{{ t('dashboard.historyChatsCount', { parsed: formatNumber(selectedHistoryItem.parsedChats), total: formatNumber(selectedHistoryItem.totalChats) }) }}</span>
                  </div>
                  <div class="history-dialog-item">
                    <span class="t-label">{{ t('common.messages') }}</span>
                    <span class="t-mono">{{ formatNumber(selectedHistoryItem.totalMessages) }}</span>
                  </div>
                  <div class="history-dialog-item">
                    <span class="t-label">Job ID</span>
                    <span class="t-mono history-dialog-jobid">{{ selectedHistoryItem.jobId }}</span>
                  </div>
                </div>

                <div v-if="selectedHistoryItem.errorMessage" class="detail-error t-small">
                  {{ selectedHistoryItem.errorMessage }}
                </div>
              </section>
            </div>
          </Transition>
        </Teleport>
      </div>
    </Container>
  </AppLayout>
</template>

<style scoped>
.page-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.stack-md {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.workspace-card {
  border-color: var(--border-default);
  box-shadow: var(--shadow-sm);
}

.section-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  min-width: 0;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.section-text {
  color: var(--text-secondary);
}

.list-grid,
.history-list {
  display: grid;
  gap: var(--space-2);
}

.dashboard-progress-inline {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.history-row {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast), transform var(--transition-fast);
}

.history-row:hover {
  border-color: var(--accent-border);
  background: color-mix(in srgb, var(--accent-subtle) 24%, var(--bg-surface));
}

.history-row:focus-visible {
  outline: none;
  border-color: var(--accent);
}

.history-main,
.dialog-title-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--space-3);
}

.dialog-copy,
.history-dialog-copy {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-2);
}

.history-title,
.selection-subline,
.history-dialog-jobid {
  overflow-wrap: anywhere;
}

.detail-error {
  padding: var(--space-3);
  border: 1px solid color-mix(in srgb, var(--danger) 28%, var(--border-default));
  border-radius: var(--radius-sm);
  background: var(--danger-subtle);
  color: var(--danger);
}

.progress-bar {
  overflow: hidden;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--bg-elevated);
}

.progress-bar-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent), var(--success));
}

.history-actions-footer {
  display: flex;
  justify-content: flex-end;
}

.history-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: var(--space-4);
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(6px);
}

.dialog-panel {
  position: relative;
  width: min(720px, 100%);
  max-height: min(80vh, 760px);
  overflow: auto;
  padding: var(--space-6);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  box-shadow: var(--shadow-lg);
}

.dialog-close {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.history-dialog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  margin-top: var(--space-5);
}

.history-dialog-item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
}

.dialog-enter-active .dialog-panel,
.dialog-leave-active .dialog-panel {
  transition: transform var(--transition-normal), opacity var(--transition-normal);
}

.dialog-enter-active .dialog-backdrop,
.dialog-leave-active .dialog-backdrop {
  transition: opacity var(--transition-normal);
}

.dialog-enter-from .dialog-panel,
.dialog-leave-to .dialog-panel {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

.dialog-enter-from .dialog-backdrop,
.dialog-leave-to .dialog-backdrop {
  opacity: 0;
}

@media (max-width: 900px) {
  .history-dialog-grid {
    grid-template-columns: 1fr;
  }

  .history-main,
  .dialog-title-row {
    align-items: flex-start;
  }
}
</style>

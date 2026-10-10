<script setup lang="ts">
import type { ParseHistoryItem } from '@tg-analyzer/shared'
import Container from '../components/layout/Container.vue'
import ParseProgress from '../components/stats/ParseProgress.vue'
import Button from '../components/ui/Button.vue'
import ConfirmDialog from '../components/ui/ConfirmDialog.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import ModalDialog from '../components/ui/ModalDialog.vue'
import Skeleton from '../components/ui/Skeleton.vue'
import ListSkeleton from '../components/ui/ListSkeleton.vue'
import { Clock, Trash2 } from '../lib/icons'
import { useI18n } from '../composables/useI18n'
import { useParseProgress } from '../composables/useParseProgress'
import { useStats } from '../composables/useStats'
import { useToast } from '../composables/useToast'
import { useStatsStore } from '../stores/stats'

definePageMeta({
  layout: 'workspace',
  middleware: ['auth'],
})

const { fetchHistory, deleteHistoryItem } = useStats()
const stats = useStatsStore()
const { progress, bootstrapped, bootstrapFromServer } = useParseProgress()
const { t, formatNumber, formatDate: formatLocaleDate } = useI18n()
const toast = useToast()
const historyPageSize = 20
const historyPage = ref(stats.historyPage)
const historyTotal = ref(stats.historyTotal)
const loadingHistoryPage = ref(false)
const historyPageCount = computed(() => Math.max(1, Math.ceil(historyTotal.value / historyPageSize)))

const ready = ref(stats.historyLoaded)
const deletingHistoryJobId = ref<string | null>(null)
const selectedHistoryItem = ref<ParseHistoryItem | null>(null)
const confirmState = ref<{
  type: 'delete-history-item'
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
  return `${formatShortDate(item.createdAt)} · ${formatNumber(item.totalMessages)} ${t('dashboard.messagesShort')}`
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
  if (!item.startedAt) {
    return t('common.na')
  }

  const startedAt = new Date(item.startedAt).getTime()
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

function openDeleteHistoryItemConfirm(jobId: string) {
  confirmState.value = {
    type: 'delete-history-item',
    title: t('dashboard.deleteHistoryItem'),
    description: t('dashboard.deleteHistoryItemConfirm'),
    confirmLabel: t('dashboard.deleteHistoryItem'),
    jobId,
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

  if (confirmState.value.type === 'delete-history-item' && confirmState.value.jobId) {
    await handleDeleteHistoryItem(confirmState.value.jobId)
  }
}

const confirmLoading = computed(() => {
  return Boolean(confirmState.value?.jobId && deletingHistoryJobId.value === confirmState.value.jobId)
})

function historyTiming(item: ParseHistoryItem) {
  return `${formatShortDate(item.startedAt)} — ${formatCompletedDate(item.completedAt)} · ${historyDuration(item)}`
}

const selectedReportPath = computed(() => {
  const item = selectedHistoryItem.value
  return item?.status === 'completed' && item.chatId ? `/chat/${item.chatId}` : ''
})

watch(isParseActive, (active, wasActive) => {
  if (!bootstrapped.value) {
    return
  }

  if (!active && wasActive) void loadHistoryPage(historyPage.value).catch(() => undefined)
})

watch(isParseTerminal, async (terminal) => {
  if (!bootstrapped.value || !terminal) {
    return
  }

  await loadHistoryPage(historyPage.value).catch(() => undefined)
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
    <Container size="default">
      <div v-if="!ready" class="page-stack" aria-busy="true">
        <section class="card section-card workspace-card">
          <div class="stack-md">
            <Skeleton height="24px" width="180px" />
            <ListSkeleton :rows="5" :avatar="false" />
          </div>
        </section>
      </div>

      <div v-else class="page-stack">
        <h1 class="sr-only">{{ t('common.history') }}</h1>
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
          <div v-if="stats.history.length" class="history-layout">
            <div class="history-list">
              <div
                v-for="(item, index) in stats.history"
                :key="item.jobId"
                class="history-row"
                :style="{ '--delay': `${index * 30}ms` }"
              >
                <div class="history-main">
                  <div
                    class="history-open"
                    role="button"
                    tabindex="0"
                    @click="openHistoryDetails(item)"
                    @keydown.enter.prevent="openHistoryDetails(item)"
                    @keydown.space.prevent="openHistoryDetails(item)"
                  >
                    <div class="dialog-copy">
                      <div class="dialog-title-row">
                        <span class="history-title">{{ formatHistoryScope(item) }}</span>
                      </div>
                      <div class="history-meta t-small">
                        <span class="selection-subline">{{ formatHistoryDates(item) }}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    v-if="item.status !== 'running' && item.status !== 'pending'"
                    variant="ghost"
                    size="sm"
                    class="delete-btn"
                    :icon="Trash2"
                    icon-only
                    :aria-label="t('dashboard.deleteHistoryItem')"
                    :loading="deletingHistoryJobId === item.jobId"
                    @click.stop="openDeleteHistoryItemConfirm(item.jobId)"
                  />
                </div>
                <div v-if="shouldRenderHistoryError(item)" class="detail-error t-small">
                  {{ item.errorMessage }}
                </div>
                <div
                  v-else-if="item.status === 'running' || item.status === 'pending'"
                  class="history-progress progress-bar"
                >
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
            <span class="t-small">{{
              t('common.pageOf', { page: formatNumber(historyPage), total: formatNumber(historyPageCount) })
            }}</span>
            <Button
              variant="secondary"
              size="sm"
              :disabled="loadingHistoryPage || historyPage >= historyPageCount"
              @click="loadHistoryPage(historyPage + 1)"
            >
              {{ t('common.nextPage') }}
            </Button>
          </nav>

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

        <ModalDialog
          :open="Boolean(selectedHistoryItem)"
          :close-label="t('common.close')"
          size="lg"
          @close="closeHistoryDetails"
        >
          <template v-if="selectedHistoryItem" #header>
            <div class="history-dialog-copy">
              <h2 class="t-h3">{{ formatHistoryScope(selectedHistoryItem) }}</h2>
            </div>
          </template>

          <template v-if="selectedHistoryItem">
            <div class="history-dialog-grid">
                  <div class="history-dialog-item history-dialog-item--wide">
                    <span class="t-label">{{ t('dashboard.runTiming') }}</span>
                    <span class="t-mono">{{ historyTiming(selectedHistoryItem) }}</span>
                  </div>
                  <div class="history-dialog-item">
                    <span class="t-label">{{ t('common.messages') }}</span>
                    <span class="t-mono">{{ formatNumber(selectedHistoryItem.totalMessages) }}</span>
                  </div>
            </div>

            <div v-if="shouldRenderHistoryError(selectedHistoryItem)" class="detail-error t-small" role="status">
              {{ t('dashboard.startError') }}
            </div>
            <Button
              v-if="selectedReportPath"
              variant="primary"
              size="md"
              class="history-dialog-open-report"
              :to="selectedReportPath"
              block
            >
              {{ t('dashboard.openReport') }}
            </Button>
          </template>
        </ModalDialog>
      </div>
    </Container>
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
  box-shadow: none;
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
  gap: 0;
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
  border: 0;
  border-bottom: 1px solid var(--border-subtle);
  border-radius: 0;
  background: transparent;
  transition:
    border-color var(--transition-fast),
    background var(--transition-fast),
    transform var(--transition-fast);
}

.history-row:hover {
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--accent-subtle) 48%, transparent);
}

.history-row:last-child {
  border-bottom: 0;
}

.history-open:focus-visible {
  outline: none;
  box-shadow: inset 3px 0 0 var(--accent);
}

.history-main,
.dialog-title-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--space-3);
}

.history-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.delete-btn {
  width: 42px;
  min-width: 42px;
  height: 42px;
  min-height: 42px;
  border-color: var(--border-default);
  border-radius: var(--radius-full);
}

.history-open {
  display: flex;
  flex: 1;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
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

.history-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  flex-wrap: wrap;
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

.history-dialog-item--wide {
  grid-column: 1 / -1;
}

.history-dialog-open-report {
  margin-top: var(--space-4);
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

<script setup lang="ts">
import type { ParseDialogDto, ParseHistoryItem } from '@tg-analyzer/shared'
import type { ApiClientError } from '../composables/useApi'
import AppLayout from '../components/AppLayout.vue'
import ChatAvatar from '../components/ChatAvatar.vue'
import Container from '../components/layout/Container.vue'
import ParseProgress from '../components/stats/ParseProgress.vue'
import Badge from '../components/ui/Badge.vue'
import Button from '../components/ui/Button.vue'
import ConfirmDialog from '../components/ui/ConfirmDialog.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import Skeleton from '../components/ui/Skeleton.vue'
import StatusDot from '../components/ui/StatusDot.vue'
import { AlertCircle, BarChart2, Clock, MessageSquare, RefreshCw, Trash2, WifiOff } from '../lib/icons'
import { useAuth } from '../composables/useAuth'
import { useI18n } from '../composables/useI18n'
import { useParseProgress } from '../composables/useParseProgress'
import { useStats } from '../composables/useStats'
import { useToast } from '../composables/useToast'
import authMiddleware from '../middleware/auth'
import { useAuthStore } from '../stores/auth'
import { useStatsStore } from '../stores/stats'

definePageMeta({
  middleware: [authMiddleware],
})

const auth = useAuthStore()
const { deleteAccount, logout, terminateTelegramSession } = useAuth()
const { clearHistory, deleteChat, deleteHistoryItem, fetchChats, fetchHistory, fetchParseDialogs } = useStats()
const stats = useStatsStore()
const { progress, bootstrapped, bootstrapFromServer, connect, disconnect, reset } = useParseProgress()
const { t, formatNumber, formatDate: formatLocaleDate, formatRelative } = useI18n()
const toast = useToast()

const pending = ref(false)
const cancelling = ref(false)
const securityPending = ref<'telegram' | 'account' | null>(null)
const deletingChatId = ref<string | null>(null)
const deletingHistoryJobId = ref<string | null>(null)
const clearingHistory = ref(false)
const ready = ref(false)
const parseDialogsLoading = ref(false)
const parseDialogsError = ref('')
const parseDialogsBusy = ref(false)
const dialogSearch = ref('')
const visibleDialogsCount = ref(18)
const pendingChatId = ref<string | null>(null)
const confirmState = ref<{
  type: 'terminate' | 'delete-account' | 'delete-report' | 'clear-history' | 'delete-history-item'
  title: string
  description: string
  confirmLabel: string
  variant: 'default' | 'danger'
  chatId?: string
  jobId?: string
} | null>(null)
const selectedHistoryItem = ref<ParseHistoryItem | null>(null)

const analyzedChats = computed(() =>
  [...stats.chats]
    .filter((chat) => chat.chatType === 'private')
    .sort((left, right) => new Date(right.parsedAt ?? 0).getTime() - new Date(left.parsedAt ?? 0).getTime()),
)
const analyzedChatIds = computed(() => new Set(analyzedChats.value.map((chat) => chat.tgChatId)))
const telegramSessionActive = computed(() => auth.telegramSessionActive)
const isParseActive = computed(() => progress.value.status === 'running' || progress.value.status === 'pending')
const isParseTerminal = computed(() => ['completed', 'failed', 'cancelled'].includes(progress.value.status))
const latestHistoryItems = computed(() => stats.history.slice(0, 8))

const filteredDialogs = computed(() => {
  const query = dialogSearch.value.trim().toLowerCase()

  return stats.parseDialogs
    .filter((dialog) => dialog.type === 'private')
    .filter((dialog) => {
      if (!query) {
        return true
      }

      return dialog.title.toLowerCase().includes(query)
    })
})

const visibleDialogs = computed(() => filteredDialogs.value.slice(0, visibleDialogsCount.value))
const hasMoreDialogs = computed(() => filteredDialogs.value.length > visibleDialogsCount.value)
const analyzedChatMap = computed(() => new Map(analyzedChats.value.map((chat) => [chat.tgChatId, chat])))
const activeHistoryJob = computed(() => stats.history.find((item) => item.status === 'running' || item.status === 'pending') ?? null)

async function loadParseDialogs() {
  parseDialogsLoading.value = true
  parseDialogsError.value = ''
  parseDialogsBusy.value = false

  try {
    await fetchParseDialogs()
  } catch (error) {
    const isBusyError = typeof (error as { statusCode?: number } | null)?.statusCode === 'number'
      && (error as { statusCode?: number }).statusCode === 409

    if (isBusyError) {
      parseDialogsBusy.value = true
      parseDialogsError.value = t('dashboard.dialogsBusy')
      return
    }

    parseDialogsError.value = error instanceof Error ? error.message : t('dashboard.loadDialogsError')
  } finally {
    parseDialogsLoading.value = false
  }
}

async function refreshOperationalData() {
  await Promise.all([
    fetchHistory(),
    fetchChats(),
  ])
}

async function startParse(chatIds?: string[]) {
  pending.value = true
  pendingChatId.value = chatIds?.length === 1 ? (chatIds[0] ?? null) : null

  try {
    await useApiFetch<{ jobId: string }>('/api/parse/start', {
      method: 'POST',
      body: chatIds?.length ? { chatIds } : {},
    })

    await bootstrapFromServer()
    await fetchHistory()
  } catch (error) {
    const err = error as ApiClientError
    const retryAfter = err.data?.retryAfter
    const code = err.code ?? (typeof err.data?.code === 'string' ? err.data.code : undefined)

    if (err.statusCode === 409) {
      if (code === 'TELEGRAM_SESSION_BUSY') {
        toast.warning(t('dashboard.startError'), err.message || t('dashboard.cancelParse'))
      } else {
        toast.info(t('dashboard.activeParse'), err.message || t('dashboard.cancelParse'))
      }
    } else if (typeof retryAfter === 'number' && retryAfter > 0) {
      toast.warning(t('dashboard.cooldownTitle'), t('dashboard.cooldown', { time: formatCooldown(retryAfter) }))
    } else {
      toast.error(error instanceof Error ? error.message : t('dashboard.startError'))
    }
  } finally {
    pending.value = false
    pendingChatId.value = null
  }
}

async function cancelActiveParse() {
  cancelling.value = true

  try {
    await useApiFetch('/api/parse/cancel', {
      method: 'DELETE',
    })

    disconnect()
    reset()

    await Promise.all([
      fetchHistory(),
      bootstrapFromServer(),
    ])

    toast.info(t('dashboard.cancelled'))
  } catch (error) {
    toast.error(error instanceof Error ? error.message : t('dashboard.cancelError'))
  } finally {
    cancelling.value = false
  }
}

async function startDialogParse(dialog: ParseDialogDto) {
  if (!telegramSessionActive.value) {
    toast.warning(t('dashboard.sessionInactive'))
    return
  }

  if (isParseActive.value) {
    toast.warning(activeHistoryJob.value?.chatName ?? t('dashboard.cancelParse'))
    return
  }

  await startParse([dialog.id])
}

function showMoreDialogs() {
  visibleDialogsCount.value += 18
}

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

function historyDuration(item: ParseHistoryItem) {
  const startedAt = new Date(item.createdAt).getTime()
  const finishedAt = item.completedAt ? new Date(item.completedAt).getTime() : Date.now()

  if (Number.isNaN(startedAt) || Number.isNaN(finishedAt) || finishedAt <= startedAt) {
    return t('common.na')
  }

  return formatCooldown(Math.round((finishedAt - startedAt) / 1000))
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

function dialogTypeLabel(type: ParseDialogDto['type']) {
  const labels: Record<ParseDialogDto['type'], string> = {
    private: t('dashboard.dialogTypePrivate'),
    group: t('dashboard.dialogTypeGroup'),
    channel: t('dashboard.dialogTypeChannel'),
    bot: t('dashboard.dialogTypeBot'),
    unknown: t('dashboard.dialogTypeUnknown'),
  }

  return labels[type]
}

function dialogState(dialog: ParseDialogDto) {
  if (progress.value.chatId === dialog.id && isParseActive.value) {
    return {
      variant: 'info' as const,
      label: statusLabel(progress.value.status),
    }
  }

  if (analyzedChatIds.value.has(dialog.id)) {
    return {
      variant: 'accent' as const,
      label: isDialogCooldownLike(dialog)
        ? t('dashboard.recentReport')
        : t('dashboard.reportReady'),
    }
  }

  return null
}

function getDialogReport(dialog: ParseDialogDto) {
  return analyzedChatMap.value.get(dialog.id) ?? null
}

function isDialogCooldownLike(dialog: ParseDialogDto) {
  const parsedAt = getDialogReport(dialog)?.parsedAt
  if (!parsedAt) {
    return false
  }

  const diffMs = Date.now() - new Date(parsedAt).getTime()
  return diffMs < 60 * 60 * 1000
}

function dialogActionLabel(dialog: ParseDialogDto) {
  return getDialogReport(dialog) ? t('chat.reparse') : t('dashboard.analyze')
}

function dialogParseDisabled(dialog: ParseDialogDto) {
  return !telegramSessionActive.value
    || pending.value
    || isParseActive.value
    || pendingChatId.value === dialog.id
}

function dialogHint(dialog: ParseDialogDto) {
  if (!telegramSessionActive.value) {
    return t('dashboard.sessionInactive')
  }

  if (isParseActive.value && progress.value.chatId === dialog.id) {
    return progress.value.message || statusLabel(progress.value.status)
  }

  if (isParseActive.value) {
    return t('dashboard.activeJobNotice')
  }

  if (isDialogCooldownLike(dialog)) {
    return t('dashboard.cooldownNotice')
  }

  if (getDialogReport(dialog)) {
    return t('dashboard.rerunHint')
  }

  return t('dashboard.firstReportHint')
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

async function handleTerminateTelegramSession() {
  securityPending.value = 'telegram'

  try {
    await terminateTelegramSession()
    toast.info(t('dashboard.sessionInactive'))
  } catch (error) {
    toast.error(error instanceof Error ? error.message : t('dashboard.terminateError'))
  } finally {
    securityPending.value = null
    confirmState.value = null
  }
}

async function handleDeleteAccount() {
  securityPending.value = 'account'

  try {
    await deleteAccount()
  } catch (error) {
    toast.error(error instanceof Error ? error.message : t('dashboard.deleteError'))
  } finally {
    securityPending.value = null
    confirmState.value = null
  }
}

async function handleDeleteReport(chatId: string) {
  deletingChatId.value = chatId

  try {
    await deleteChat(chatId)
    await fetchChats()
    toast.success(t('dashboard.reportDeleted'))
  } catch (error) {
    toast.error(error instanceof Error ? error.message : t('dashboard.deleteReportError'))
  } finally {
    deletingChatId.value = null
    confirmState.value = null
  }
}

async function handleClearHistory() {
  clearingHistory.value = true

  try {
    await clearHistory()
    await fetchHistory()
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
    await fetchHistory()
    toast.success(t('dashboard.historyItemDeleted'))
  } catch (error) {
    toast.error(error instanceof Error ? error.message : t('dashboard.deleteHistoryItemError'))
  } finally {
    deletingHistoryJobId.value = null
    confirmState.value = null
  }
}

function openTerminateConfirm() {
  confirmState.value = {
    type: 'terminate',
    title: t('dashboard.terminateTelegram'),
    description: t('dashboard.terminateConfirm'),
    confirmLabel: t('dashboard.terminateTelegram'),
    variant: 'default',
  }
}

function openDeleteAccountConfirm() {
  confirmState.value = {
    type: 'delete-account',
    title: t('dashboard.deleteAccount'),
    description: t('dashboard.deleteConfirm'),
    confirmLabel: t('dashboard.deleteAccount'),
    variant: 'danger',
  }
}

function openDeleteReportConfirm(chatId: string, title: string) {
  confirmState.value = {
    type: 'delete-report',
    title: t('dashboard.deleteReport'),
    description: t('dashboard.deleteReportConfirm', { name: title }),
    confirmLabel: t('dashboard.deleteReport'),
    variant: 'danger',
    chatId,
  }
}

function openClearHistoryConfirm() {
  confirmState.value = {
    type: 'clear-history',
    title: t('dashboard.clearHistory'),
    description: t('dashboard.clearHistoryConfirm'),
    confirmLabel: t('dashboard.clearHistory'),
    variant: 'danger',
  }
}

function openDeleteHistoryItemConfirm(jobId: string) {
  confirmState.value = {
    type: 'delete-history-item',
    title: t('dashboard.deleteHistoryItem'),
    description: t('dashboard.deleteHistoryItemConfirm'),
    confirmLabel: t('dashboard.deleteHistoryItem'),
    variant: 'danger',
    jobId,
  }
}

function openHistoryDetails(item: ParseHistoryItem) {
  selectedHistoryItem.value = item
}

function closeHistoryDetails() {
  selectedHistoryItem.value = null
}

async function confirmAction() {
  if (!confirmState.value) {
    return
  }

  if (confirmState.value.type === 'terminate') {
    await handleTerminateTelegramSession()
  } else if (confirmState.value.type === 'delete-account') {
    await handleDeleteAccount()
  } else if (confirmState.value.type === 'delete-report' && confirmState.value.chatId) {
    await handleDeleteReport(confirmState.value.chatId)
  } else if (confirmState.value.type === 'clear-history') {
    await handleClearHistory()
  } else if (confirmState.value.type === 'delete-history-item' && confirmState.value.jobId) {
    await handleDeleteHistoryItem(confirmState.value.jobId)
  }
}

const confirmLoading = computed(() => {
  if (!confirmState.value) {
    return false
  }
  if (confirmState.value.type === 'terminate') {
    return securityPending.value === 'telegram'
  }
  if (confirmState.value.type === 'delete-account') {
    return securityPending.value === 'account'
  }
  if (confirmState.value.type === 'delete-report') {
    return deletingChatId.value === confirmState.value.chatId
  }
  if (confirmState.value.type === 'delete-history-item') {
    return deletingHistoryJobId.value === confirmState.value.jobId
  }
  return clearingHistory.value
})

watch(dialogSearch, () => {
  visibleDialogsCount.value = 18
})

watch(isParseActive, async (active, wasActive) => {
  if (!bootstrapped.value) {
    return
  }

  if (active) {
    connect()
    return
  }

  disconnect()

  if (wasActive) {
    await refreshOperationalData().catch(() => undefined)
  }
})

watch(isParseTerminal, async (terminal) => {
  if (!bootstrapped.value || !terminal) {
    return
  }

  disconnect()
  await refreshOperationalData().catch(() => undefined)
})

watch(() => progress.value.status, (status, previousStatus) => {
  if (status === previousStatus) {
    return
  }

  const wasActive = previousStatus === 'running' || previousStatus === 'pending'
  if (!wasActive) {
    return
  }

  if (status === 'completed') {
    toast.success(t('dashboard.reportReady'), progress.value.message || t('common.statusCompleted'))
  } else if (status === 'failed') {
    toast.error(t('common.statusFailed'), progress.value.message || t('dashboard.startError'))
  } else if (status === 'cancelled') {
    toast.info(t('common.statusCancelled'), progress.value.message || t('dashboard.cancelled'))
  }
})

onBeforeUnmount(() => {
  disconnect()
})

onMounted(async () => {
  try {
    try {
      await bootstrapFromServer()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('dashboard.loadStatsError'))
    }

    await Promise.all([
      fetchChats().catch((error) => {
        toast.error(error instanceof Error ? error.message : t('dashboard.loadStatsError'))
      }),
      fetchHistory().catch((error) => {
        toast.error(error instanceof Error ? error.message : t('dashboard.loadStatsError'))
      }),
    ])

    await loadParseDialogs()
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
      <div class="dashboard-grid">
        <section class="card workspace-card">
          <div class="stack-md">
            <Skeleton height="24px" width="160px" />
            <Skeleton height="132px" radius="var(--radius-md)" />
            <div class="list-grid">
              <Skeleton v-for="item in 6" :key="item" height="88px" radius="var(--radius-md)" />
            </div>
          </div>
        </section>
        <section class="card workspace-card">
          <div class="stack-md">
            <Skeleton height="24px" width="140px" />
            <div class="list-grid">
              <Skeleton v-for="item in 4" :key="item" height="96px" radius="var(--radius-md)" />
            </div>
          </div>
        </section>
        <section class="card workspace-card">
          <div class="stack-md">
            <Skeleton height="24px" width="180px" />
            <div class="list-grid">
              <Skeleton v-for="item in 4" :key="`history-${item}`" height="96px" radius="var(--radius-md)" />
            </div>
          </div>
        </section>
      </div>
    </div>

    <div v-else class="page-stack animate-fade-in" :class="{ 'page-stack-with-mobile-toast': isParseActive }">
      

      <ParseProgress v-if="isParseActive" class="dashboard-progress-inline" compact :current="progress.current" :total="progress.total"
        :chat-name="progress.chatName" :status="progress.status" :message="progress.message"
        :scanned-messages="progress.scannedMessages" :start-time="progress.startTime" cancellable
        :cancelling="cancelling" @cancel="cancelActiveParse" />

      <div class="dashboard-grid">
        <section class="card section-card workspace-card">
          <div class="section-header">
            <div class="section-copy">
              <span class="text-label">{{ t('dashboard.sourceLabel') }}</span>
              <h2 class="text-h2">{{ t('dashboard.sourceTitle') }}</h2>
              <p class="text-body-sm section-text">{{ t('dashboard.sourceText') }}</p>
            </div>
          </div>

          <div class="source-actions">
            <input v-model="dialogSearch" type="text" class="input" :placeholder="t('dashboard.search')" />
          </div>

          <div v-if="!telegramSessionActive" class="info-banner warning-banner">
            {{ t('dashboard.sessionInactive') }}
          </div>

          <div v-else-if="parseDialogsLoading" class="list-grid">
            <div v-for="item in 6" :key="item" class="card-elevated dialog-skeleton">
              <Skeleton height="88px" radius="var(--radius-md)" />
            </div>
          </div>

          <EmptyState
            v-else-if="parseDialogsError"
            :icon="parseDialogsBusy ? WifiOff : AlertCircle"
            :title="parseDialogsBusy ? t('dashboard.dialogsBusy') : t('dashboard.loadDialogsError')"
            :description="parseDialogsError"
          >
            <template #action>
              <Button variant="secondary" @click="loadParseDialogs">
                {{ t('common.retry') }}
              </Button>
            </template>
          </EmptyState>

          <div v-else class="stack-lg">
            

            <div v-if="visibleDialogs.length" class="dialog-list">
              <div v-for="(dialog, index) in visibleDialogs" :key="dialog.id" class="dialog-item stagger-item"
                :class="{ 'dialog-item-active': progress.chatId === dialog.id && isParseActive }"
                :style="{ '--delay': `${index * 35}ms` }">
                <NuxtLink v-if="getDialogReport(dialog)" :to="`/chat/${dialog.id}`" class="dialog-main dialog-main-link">
                  <ChatAvatar :chat-id="dialog.id" :title="dialog.title" :has-avatar="dialog.hasAvatar" />
                  <div class="dialog-copy">
                    <div class="dialog-title-row">
                      <span class="dialog-title">{{ dialog.title }}</span>
                    </div>
                    <div class="dialog-meta text-body-sm">
                      <span class="mono-value">{{ dialogTypeLabel(dialog.type) }}</span>
                      <span class="text-caption selection-subline">{{ t('dashboard.lastAnalyzed', { time: formatRelative(getDialogReport(dialog)?.parsedAt) }) }}</span>
                    </div>
                  </div>
                </NuxtLink>
                <div v-else class="dialog-main">
                  <ChatAvatar :chat-id="dialog.id" :title="dialog.title" :has-avatar="dialog.hasAvatar" />
                  <div class="dialog-copy">
                    <div class="dialog-title-row">
                      <span class="dialog-title">{{ dialog.title }}</span>
                      <StatusDot v-if="dialogState(dialog)" :variant="dialogState(dialog)?.variant ?? 'default'"
                        :label="dialogState(dialog)?.label ?? ''" />
                    </div>
                    <div class="dialog-meta text-body-sm">
                      <span class="mono-value">{{ dialogTypeLabel(dialog.type) }}</span>
                    </div>
                  </div>
                </div>
                
                <div class="dialog-actions">
                  <template v-if="getDialogReport(dialog)">
                    <NuxtLink :to="`/chat/${dialog.id}`" class="dialog-report-link">
                      {{ t('common.report') }}
                    </NuxtLink>
                    <Button variant="ghost" size="sm" class="dialog-refresh-button" :icon="RefreshCw"
                      :loading="pendingChatId === dialog.id"
                      :disabled="dialogParseDisabled(dialog)" @click="startDialogParse(dialog)" />
                  </template>
                  <Button v-else variant="secondary" size="sm" class="dialog-analyze-button" :loading="pendingChatId === dialog.id"
                    :disabled="dialogParseDisabled(dialog)" @click="startDialogParse(dialog)">
                    {{ t('dashboard.analyze') }}
                  </Button>
                </div>
              </div>
            </div>
            <EmptyState
              v-else
              :icon="MessageSquare"
              :title="t('dashboard.noChatsTitle')"
              :description="t('dashboard.noChatsDescription')"
            />

            <div v-if="hasMoreDialogs" class="more-row">
              <Button variant="secondary" @click="showMoreDialogs">{{ t('common.showMore') }}</Button>
            </div>
          </div>
        </section>

        <section class="card section-card workspace-card">
            <div class="section-header">
              <div class="section-copy">
                <span class="text-label">{{ t('dashboard.analyzedLabel') }}</span>
                <div class="section-title-row">
                  <h2 class="text-h2">{{ t('dashboard.analyzedTitle') }}</h2>
                  <Badge variant="accent">{{ t('dashboard.readyCount', { count: formatNumber(analyzedChats.length) }) }}</Badge>
                </div>
                <p class="text-body-sm section-text">{{ t('dashboard.analyzedText') }}</p>
              </div>
            </div>

            <div v-if="analyzedChats.length" class="analyzed-list">
              <div v-for="(chat, index) in analyzedChats" :key="chat.tgChatId" class="analyzed-card stagger-item"
                :style="{ '--delay': `${index * 45}ms` }">
                <NuxtLink :to="`/chat/${chat.tgChatId}`" class="analyzed-link">
                  <ChatAvatar :chat-id="chat.tgChatId" :title="chat.chatName || chat.tgChatId" />
                  <div class="dialog-copy">
                    <div class="dialog-title-row">
                      <span class="dialog-title">{{ chat.chatName || chat.tgChatId }}</span>
                    </div>
                    <div class="analyzed-foot text-body-sm">
                      <span class="mono-value analyzed-date">{{ formatShortDate(chat.parsedAt) }}</span>
                    </div>
                  </div>
                </NuxtLink>

                <div class="analyzed-actions">
                  <Button variant="ghost" size="sm" class="delete-btn" :icon="Trash2" aria-label="Delete" :loading="deletingChatId === chat.tgChatId" @click="openDeleteReportConfirm(chat.tgChatId, chat.chatName || chat.tgChatId)" />
                </div>
              </div>
            </div>

            <EmptyState
              v-else
              :icon="BarChart2"
              :title="t('dashboard.noParsedTitle')"
              :description="t('dashboard.noParsedDescription')"
            />
        </section>

        <section class="stack-lg dashboard-side-column">
          <section class="card section-card workspace-card">
            <div class="section-header">
              <div class="section-copy">
                <span class="text-label">{{ t('dashboard.runHistoryLabel') }}</span>
                <div class="section-title-row">
                  <h2 class="text-h2">{{ t('dashboard.runHistoryTitle') }}</h2>
                  <Badge variant="accent">{{ t('dashboard.jobsCount', { count: formatNumber(stats.history.length) }) }}</Badge>
                </div>
                <p class="text-body-sm section-text">{{ t('dashboard.runHistoryText') }}</p>
              </div>
            </div>

            <div v-if="stats.history.length" class="history-layout">
              <div class="history-list">
                <div v-for="(item, index) in latestHistoryItems" :key="item.jobId" class="history-row stagger-item"
                  :style="{ '--delay': `${index * 40}ms` }"
                  role="button"
                  tabindex="0"
                  @click="openHistoryDetails(item)"
                  @keydown.enter.prevent="openHistoryDetails(item)"
                  @keydown.space.prevent="openHistoryDetails(item)">
                  <div class="history-main">
                    <div class="dialog-copy">
                      <div class="dialog-title-row">
                        <span class="history-title">{{ formatHistoryScope(item) }}</span>
                        <StatusDot :variant="statusVariant(item.status)" :label="statusLabel(item.status)" />
                      </div>
                      <div class="history-meta text-caption">
                        <span class="mono-value history-dates">{{ formatHistoryDates(item) }}</span>
                      </div>
                    </div>
                    <Button v-if="item.status !== 'running' && item.status !== 'pending'" variant="ghost" size="sm" class="delete-btn" :icon="Trash2" aria-label="Delete" :loading="deletingHistoryJobId === item.jobId" @click.stop="openDeleteHistoryItemConfirm(item.jobId)" />
                  </div>
                  <div v-if="shouldRenderHistoryError(item)" class="detail-error text-body-sm">
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
            <div v-if="stats.history.length" class="history-actions-footer">
              <Button variant="ghost" size="sm" class="history-clear-button" :loading="clearingHistory"
                @click="openClearHistoryConfirm">
                {{ t('dashboard.clearHistory') }}
              </Button>
            </div>
          </section>

          <section class="card section-card workspace-card mobile-security-section">
            <div class="section-copy">
              <span class="text-label">{{ t('dashboard.securityLabel') }}</span>
              <h2 class="text-h2">{{ t('dashboard.securityTitle') }}</h2>
              <p class="text-body-sm section-text">{{ t('dashboard.securityText') }}</p>
            </div>

            <div class="stack-md">
              <div v-if="!telegramSessionActive" class="info-banner warning-banner">
                {{ t('dashboard.sessionInactive') }}
              </div>

              <Button variant="secondary" size="lg" :loading="securityPending === 'telegram'"
                @click="openTerminateConfirm">
                {{ securityPending === 'telegram' ? t('dashboard.stopping') : t('dashboard.terminateTelegram') }}
              </Button>
              <Button variant="danger" size="lg" :loading="securityPending === 'account'"
                @click="openDeleteAccountConfirm">
                {{ securityPending === 'account' ? t('dashboard.deleting') : t('dashboard.deleteAccount') }}
              </Button>
              <Button variant="primary" size="lg" @click="logout">
                {{ t('common.logout') }}
              </Button>
            </div>
          </section>
        </section>
      </div>

      <ConfirmDialog :open="Boolean(confirmState)" :title="confirmState?.title ?? ''"
        :description="confirmState?.description ?? ''" :confirm-label="confirmState?.confirmLabel ?? ''"
        :cancel-label="t('common.cancel')" :variant="confirmState?.variant ?? 'default'" :loading="confirmLoading"
        @close="confirmState = null" @confirm="confirmAction" />

      <Teleport to="body">
        <Transition name="dialog">
          <div v-if="selectedHistoryItem" class="dialog-backdrop" @click.self="closeHistoryDetails">
            <section class="dialog-panel history-dialog-panel" role="dialog" aria-modal="true">
              <div class="history-dialog-copy">
                <div class="section-title-row">
                  <h2 class="text-h3">{{ formatHistoryScope(selectedHistoryItem) }}</h2>
                  <Badge :variant="statusVariant(selectedHistoryItem.status)">{{ statusLabel(selectedHistoryItem.status) }}</Badge>
                </div>
                <p class="text-body-sm">{{ selectedHistoryItem.chatName || selectedHistoryItem.chatId || selectedHistoryItem.jobId }}</p>
              </div>

              <div class="history-dialog-grid">
                <div class="history-dialog-item">
                  <span class="text-label">{{ t('dashboard.started') }}</span>
                  <span class="mono-value">{{ formatShortDate(selectedHistoryItem.createdAt) }}</span>
                </div>
                <div class="history-dialog-item">
                  <span class="text-label">{{ t('dashboard.finished') }}</span>
                  <span class="mono-value">{{ formatCompletedDate(selectedHistoryItem.completedAt) }}</span>
                </div>
                <div class="history-dialog-item">
                  <span class="text-label">{{ t('dashboard.duration') }}</span>
                  <span class="mono-value">{{ historyDuration(selectedHistoryItem) }}</span>
                </div>
                <div class="history-dialog-item">
                  <span class="text-label">{{ t('dashboard.progress') }}</span>
                  <span class="mono-value">{{ t('dashboard.historyChatsCount', { parsed: formatNumber(selectedHistoryItem.parsedChats), total: formatNumber(selectedHistoryItem.totalChats) }) }}</span>
                </div>
                <div class="history-dialog-item">
                  <span class="text-label">{{ t('common.messages') }}</span>
                  <span class="mono-value">{{ formatNumber(selectedHistoryItem.totalMessages) }}</span>
                </div>
                <div class="history-dialog-item">
                  <span class="text-label">Job ID</span>
                  <span class="mono-value history-dialog-jobid">{{ selectedHistoryItem.jobId }}</span>
                </div>
              </div>

              <div v-if="selectedHistoryItem.errorMessage" class="detail-error text-body-sm">
                {{ selectedHistoryItem.errorMessage }}
              </div>

              <div class="history-dialog-actions">
                <Button variant="secondary" @click="closeHistoryDetails">
                  {{ t('common.close') }}
                </Button>
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

.stack-md,
.stack-lg {
  display: flex;
  flex-direction: column;
}

.stack-md {
  gap: var(--space-4);
}

.stack-lg {
  gap: var(--space-6);
}

.mobile-security-section {
  display: none !important;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.95fr) minmax(300px, 0.8fr);
  gap: var(--space-6);
  min-width: 0;
  align-items: start;
}

.workspace-header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-6);
  padding: var(--space-5) var(--space-6);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-elevated) 100%);
  box-shadow: var(--shadow-sm);
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  max-width: 760px;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.hero-copy p,
.section-text {
  color: var(--text-secondary);
  overflow-wrap: anywhere;
}

.info-banner {
  border-radius: var(--radius-md);
  padding: var(--space-4);
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  color: var(--text-secondary);
}

.warning-banner {
  border-color: var(--color-warning);
  background: var(--color-warning-muted);
  color: var(--color-warning);
}

.danger-banner {
  border-color: var(--color-danger);
  background: var(--color-danger-muted);
  color: var(--color-danger);
}

.info-banner-tone {
  border-color: var(--color-info);
  background: var(--color-info-muted);
  color: var(--color-info);
}

.section-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  min-width: 0;
}

.workspace-card {
  border-color: var(--border-default);
  box-shadow: var(--shadow-sm);
}

.source-actions {
  display: flex;
  min-width: 0;
}

.dialog-list,
.analyzed-list,
.list-grid,
.history-list {
  display: grid;
  gap: var(--space-2);
}

.dialog-skeleton {
  padding: 0;
  background: transparent;
  border: none;
}

.dialog-item,
.analyzed-card,
.history-row {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  transition: all var(--transition-fast);
}

.selection-subline,
.dialog-hint {
  color: var(--text-secondary);
}

.dialog-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  width: 100%;
}

.dialog-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  min-height: 58px;
  padding: var(--space-3) var(--space-4);
  min-width: 0;
}

.dialog-item:hover,
.dialog-item-active,
.analyzed-card:hover,
.history-row:hover {
  border-color: var(--border-strong);
  background: var(--bg-elevated);
}

.dialog-item-active {
  border-color: var(--accent-border);
  box-shadow: inset 0 0 0 1px var(--accent-border);
}

.dialog-main {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.dialog-main-link {
  cursor: pointer;
}

.dialog-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 5px;
}

.dialog-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  flex-wrap: wrap;
  flex: 0 0 auto;
}

.dialog-actions :deep(.ui-button) {
  min-height: 34px;
  height: 34px;
}

.dialog-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  max-width: 100%;
  color: var(--text-secondary);
  line-height: 1.25;
}

.dialog-meta > * {
  min-width: 0;
}

.dialog-meta .selection-subline {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dialog-meta .selection-subline::before {
  content: '';
  display: inline-flex;
  width: 4px;
  height: 4px;
  margin-right: var(--space-2);
  border-radius: var(--radius-full);
  background: var(--text-tertiary);
  vertical-align: middle;
}

.dialog-report-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  height: 34px;
  padding: 0 var(--space-3);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: var(--accent);
  color: var(--accent-text);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  text-decoration: none;
  white-space: nowrap;
  transition:
    background var(--transition-fast),
    transform var(--transition-fast),
    box-shadow var(--transition-fast);
  box-shadow: var(--shadow-accent);
}

.dialog-report-link:hover {
  background: var(--accent-hover);
  transform: scale(0.99);
}

.dialog-action-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  height: 34px;
  box-sizing: border-box;
  padding: 0 var(--space-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 12px;
  font-weight: 600;
  transition: border-color var(--transition-fast), background var(--transition-fast), color var(--transition-fast);
}

.dialog-action-link:hover {
  border-color: var(--border-strong);
  background: var(--bg-elevated);
}

.dialog-analyze-button {
  min-width: 104px;
  white-space: nowrap;
}

.dialog-refresh-button {
  width: 34px;
  min-width: 34px;
  height: 34px;
  padding: 0;
}

.dialog-title,
.history-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-row {
  display: flex;
  justify-content: center;
}

.page-stack-with-mobile-toast {
  padding-bottom: 0;
}

.dashboard-progress-inline {
  display: block;
}

.analyzed-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  min-height: 52px;
}

.analyzed-link {
  display: flex;
  align-items: center;
  flex: 1;
  gap: var(--space-3);
  min-width: 0;
}

.analyzed-head,
.analyzed-foot,
.history-row-head,
.history-meta,
.history-actions,
.section-actions,
.analyzed-actions,
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.section-actions,
.history-actions,
.analyzed-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
  min-width: 0;
}

.analyzed-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  flex: 1;
}

.delete-btn {
  color: var(--text-tertiary);
}

.delete-btn:hover {
  color: var(--color-danger);
}

.analyzed-foot {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  flex-wrap: wrap;
  color: var(--text-secondary);
}

.analyzed-date {
  display: inline-flex;
  white-space: nowrap;
}

.analyzed-count {
  color: var(--text-tertiary);
}

.history-layout {
  min-width: 0;
}

.dashboard-side-column {
  min-width: 0;
}

.history-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-1.5);
  padding: var(--space-3) var(--space-4);
  min-width: 0;
  cursor: pointer;
}

.history-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-width: 0;
}

.history-progress {
  height: 4px;
}

.history-meta {
  flex-wrap: nowrap;
  white-space: nowrap;
  overflow-x: auto;
  color: var(--text-secondary);
  scrollbar-width: none;
}

.history-meta::-webkit-scrollbar {
  display: none;
}

.history-separator {
  width: 4px;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--text-tertiary);
  flex: 0 0 auto;
}

.history-dates {
  min-width: 0;
}

.history-actions-footer {
  display: flex;
  justify-content: center;
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-subtle);
}

.history-clear-button {
  width: 100%;
  justify-content: center;
  min-height: 40px;
  color: var(--text-secondary);
}

.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(0, 0, 0, 0.64);
}

.dialog-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  padding: var(--space-5);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  box-shadow: var(--shadow-lg);
}

.history-dialog-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.history-dialog-copy p {
  color: var(--text-secondary);
}

.history-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.history-dialog-panel {
  width: min(100%, 560px);
}

.history-dialog-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.history-dialog-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-elevated);
  min-width: 0;
}

.history-dialog-jobid {
  overflow-wrap: anywhere;
}

.dialog-enter-active,
.dialog-leave-active {
  transition: opacity var(--transition-base);
}

.dialog-enter-active .dialog-panel,
.dialog-leave-active .dialog-panel {
  transition: transform var(--transition-base);
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .dialog-panel,
.dialog-leave-to .dialog-panel {
  transform: translateY(8px) scale(0.98);
}

.detail-error {
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  background: var(--color-danger-muted);
  color: var(--color-danger);
  overflow-wrap: anywhere;
}

@media (max-width: 1200px) {
  .dashboard-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 900px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {

  .dashboard-progress-inline {
    display: none;
  }

  .mobile-security-section {
    display: flex !important;
  }

  .dialog-action-link {
    width: 100%;
    min-height: 34px;
    height: 34px;
  }

  .workspace-header,
  .analyzed-head,
  .section-actions,
  .analyzed-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .section-header {
    align-items: flex-start;
  }

  .section-title-row {
    align-items: flex-start;
  }

  .workspace-header {
    padding: var(--space-4);
  }

  .section-card,
  .analyzed-card,
  .history-row {
    padding: var(--space-4);
  }

  .section-actions {
    width: 100%;
    justify-content: space-between;
  }

  .analyzed-card {
    gap: var(--space-2);
    padding: var(--space-3);
  }

  .analyzed-link {
    gap: var(--space-2);
  }

  .analyzed-meta {
    gap: var(--space-2);
  }

  .analyzed-count {
    font-size: 12px;
  }

  .dialog-item {
    grid-template-columns: 1fr;
    align-items: stretch;
    gap: var(--space-2);
    min-height: unset;
    padding: var(--space-3);
  }

  .dialog-main {
    grid-template-columns: auto minmax(0, 1fr);
    align-items: flex-start;
    gap: var(--space-2);
  }

  .dialog-copy {
    gap: 4px;
  }

  .dialog-title-row {
    width: 100%;
    justify-content: space-between;
    align-items: center;
  }

  .dialog-title {
    min-width: 0;
    flex: 1;
  }

  .selection-subline,
  .analyzed-foot {
    font-size: 12px;
  }

  .dialog-meta {
    gap: var(--space-1);
    flex-wrap: wrap;
  }

  .dialog-meta .selection-subline {
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .dialog-actions {
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 34px;
    gap: var(--space-2);
  }

  .dialog-action-link {
    width: 100%;
    min-height: 34px;
  }

  .dialog-report-link {
    min-height: 34px;
    height: 34px;
    width: 100%;
    padding: 0 var(--space-4);
  }

  .dialog-actions :deep(.ui-button) {
    min-height: 34px;
  }

  .dialog-refresh-button {
    width: 34px;
    min-width: 34px;
    padding: 0;
  }

  .dialog-analyze-button {
    width: 100%;
    min-width: 0;
  }

  .dialog-actions > :only-child:not(.dialog-refresh-button) {
    grid-column: 1 / -1;
  }

  .analyzed-foot {
    flex-wrap: nowrap;
    overflow-x: auto;
    white-space: nowrap;
    scrollbar-width: none;
  }

  .analyzed-foot::-webkit-scrollbar {
    display: none;
  }

  .history-row {
    gap: var(--space-2);
    padding: var(--space-3);
  }

  .history-main {
    align-items: flex-start;
  }

  .history-main .dialog-copy {
    width: 100%;
  }

  .history-main .dialog-title-row {
    justify-content: flex-start;
    gap: var(--space-2);
  }

  .history-row-head {
    flex-direction: row;
    align-items: center;
  }

  .history-progress {
    height: 3px;
  }

  .history-meta {
    gap: var(--space-2);
    font-size: 11px;
  }

  .detail-error {
    padding: var(--space-2);
    font-size: 12px;
  }

  .history-actions-footer {
    margin-top: var(--space-3);
    padding-top: var(--space-2);
  }

  .dialog-backdrop {
    align-items: flex-end;
    padding: var(--space-3);
  }

  .dialog-panel {
    width: 100%;
    padding: var(--space-4);
  }

  .history-dialog-actions {
    flex-direction: column-reverse;
  }

  .history-dialog-grid {
    grid-template-columns: 1fr;
  }
}

</style>

<script setup lang="ts">
import type { ParseDialogDto, ParseHistoryItem } from '@tg-analyzer/shared'
import AppLayout from '../components/AppLayout.vue'
import ChatAvatar from '../components/ChatAvatar.vue'
import ParseProgress from '../components/stats/ParseProgress.vue'
import Badge from '../components/ui/Badge.vue'
import Button from '../components/ui/Button.vue'
import ConfirmDialog from '../components/ui/ConfirmDialog.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import Skeleton from '../components/ui/Skeleton.vue'
import StatusDot from '../components/ui/StatusDot.vue'
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
const { clearHistory, deleteChat, fetchChats, fetchHistory, fetchParseDialogs, fetchParseStatus } = useStats()
const stats = useStatsStore()
const { progress, applyStatus, connect, disconnect, reset } = useParseProgress()
const { t, formatNumber, formatDate: formatLocaleDate, formatRelative } = useI18n()
const toast = useToast()

const pending = ref(false)
const cancelling = ref(false)
const securityPending = ref<'telegram' | 'account' | null>(null)
const deletingChatId = ref<string | null>(null)
const clearingHistory = ref(false)
const ready = ref(false)
const parseDialogsLoading = ref(false)
const parseDialogsError = ref('')
const parseDialogsBusy = ref(false)
const dialogSearch = ref('')
const visibleDialogsCount = ref(18)
const selectedDialogId = ref<string | null>(null)
const confirmState = ref<{
  type: 'terminate' | 'delete-account' | 'delete-report' | 'clear-history' | 'delete-history-item'
  title: string
  description: string
  confirmLabel: string
  variant: 'default' | 'danger'
  chatId?: string
  jobId?: string
} | null>(null)

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
const selectedDialog = computed(() => filteredDialogs.value.find((dialog) => dialog.id === selectedDialogId.value)
  ?? stats.parseDialogs.find((dialog) => dialog.id === selectedDialogId.value)
  ?? null)
const selectedDialogReport = computed(() => analyzedChats.value.find((chat) => chat.tgChatId === selectedDialogId.value) ?? null)
const selectedDialogCooldownLike = computed(() => {
  const parsedAt = selectedDialogReport.value?.parsedAt
  if (!parsedAt) {
    return false
  }

  const diffMs = Date.now() - new Date(parsedAt).getTime()
  return diffMs < 60 * 60 * 1000
})
const activeHistoryJob = computed(() => stats.history.find((item) => item.status === 'running' || item.status === 'pending') ?? null)
const selectedDialogDisabled = computed(() => !selectedDialog.value || !telegramSessionActive.value || pending.value || isParseActive.value)

async function loadParseDialogs() {
  parseDialogsLoading.value = true
  parseDialogsError.value = ''
  parseDialogsBusy.value = false

  try {
    await fetchParseDialogs()
    if (!selectedDialogId.value && stats.parseDialogs.length) {
      selectedDialogId.value = stats.parseDialogs.find((dialog) => dialog.type === 'private')?.id ?? null
    }
  } catch (error) {
    const isBusyError = typeof (error as { statusCode?: number } | null)?.statusCode === 'number'
      && (error as { statusCode?: number }).statusCode === 409

    if (isBusyError) {
      if (!selectedDialogId.value && stats.parseDialogs.length) {
        selectedDialogId.value = stats.parseDialogs.find((dialog) => dialog.type === 'private')?.id ?? null
      }
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

  try {
    const result = await useApiFetch<{ jobId: string }>('/api/parse/start', {
      method: 'POST',
      body: chatIds?.length ? { chatIds } : {},
    })

    toast.success(t('dashboard.parseStarted'), t('dashboard.startedJob', { jobId: result.jobId }))

    const parseStatus = await fetchParseStatus()
    applyStatus(parseStatus)
    connect()
    await fetchHistory()
  } catch (error) {
    const retryAfter = (error as { data?: { retryAfter?: number } })?.data?.retryAfter
    if (typeof retryAfter === 'number' && retryAfter > 0) {
      toast.warning(t('dashboard.cooldownTitle'), t('dashboard.cooldown', { time: formatCooldown(retryAfter) }))
    } else {
      toast.error(error instanceof Error ? error.message : t('dashboard.startError'))
    }
  } finally {
    pending.value = false
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
      fetchParseStatus().then(applyStatus),
    ])

    toast.info(t('dashboard.cancelled'))
  } catch (error) {
    toast.error(error instanceof Error ? error.message : t('dashboard.cancelError'))
  } finally {
    cancelling.value = false
  }
}

async function startSelectedDialogParse() {
  if (!selectedDialog.value) {
    toast.warning(t('dashboard.selectOne'))
    return
  }

  if (!telegramSessionActive.value) {
    toast.warning(t('dashboard.sessionInactive'))
    return
  }

  if (isParseActive.value) {
    toast.warning(activeHistoryJob.value?.chatName ?? t('dashboard.cancelParse'))
    return
  }

  await startParse([selectedDialog.value.id])
}

function selectDialog(dialog: ParseDialogDto) {
  selectedDialogId.value = dialog.id
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
  const started = formatShortDate(item.createdAt)
  const finished = item.completedAt ? formatShortDate(item.completedAt) : t('dashboard.historyStillActive')
  return `${started} • ${finished}`
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
      label: selectedDialogId.value === dialog.id && selectedDialogCooldownLike.value
        ? t('dashboard.recentReport')
        : t('dashboard.reportReady'),
    }
  }

  return null
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
  return clearingHistory.value
})

watch(dialogSearch, () => {
  visibleDialogsCount.value = 18
})

watch(isParseActive, async (active, wasActive) => {
  if (active) {
    connect()
    return
  }

  if (wasActive) {
    await refreshOperationalData().catch(() => undefined)
  }
}, { immediate: true })

watch(isParseTerminal, async (terminal) => {
  if (!terminal) {
    return
  }

  await refreshOperationalData().catch(() => undefined)
})

onBeforeUnmount(() => {
  disconnect()
})

onMounted(async () => {
  try {
    try {
      applyStatus(await fetchParseStatus())
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
    <div v-if="!ready" class="page-stack">
      <section class="card">
        <Skeleton height="144px" radius="var(--radius-lg)" />
      </section>
      <div class="dashboard-grid">
        <section class="card">
          <div class="stack-md">
            <Skeleton height="24px" width="160px" />
            <Skeleton height="132px" radius="var(--radius-md)" />
            <div class="list-grid">
              <Skeleton v-for="item in 6" :key="item" height="88px" radius="var(--radius-md)" />
            </div>
          </div>
        </section>
        <section class="stack-lg">
          <section class="card">
            <div class="list-grid">
              <Skeleton v-for="item in 4" :key="item" height="96px" radius="var(--radius-md)" />
            </div>
          </section>
          <section class="card">
            <div class="list-grid">
              <Skeleton v-for="item in 3" :key="item" height="96px" radius="var(--radius-md)" />
            </div>
          </section>
        </section>
      </div>
    </div>

    <div v-else class="page-stack animate-fade-in">
      <header class="workspace-header">
        <div class="hero-copy">
          <span class="text-label">{{ t('dashboard.workspace') }}</span>
          <h1 class="text-h1">{{ t('dashboard.title') }}</h1>
          <p class="text-body-lg">{{ t('dashboard.subtitle') }}</p>
        </div>
      </header>

      <ParseProgress
        v-if="isParseActive"
        :current="progress.current"
        :total="progress.total"
        :chat-name="progress.chatName"
        :status="progress.status"
        :message="progress.message"
        cancellable
        :cancelling="cancelling"
        @cancel="cancelActiveParse"
      />

      <div class="dashboard-grid">
        <section class="card section-card">
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

          <div v-if="selectedDialog" class="selection-card">
            <div class="selection-head">
              <div class="selection-main">
                <ChatAvatar :chat-id="selectedDialog.id" :title="selectedDialog.title" :has-avatar="selectedDialog.hasAvatar" />
                <div class="dialog-copy">
                  <span class="text-label">{{ t('dashboard.currentSelection') }}</span>
                  <div class="dialog-title-row">
                    <strong class="dialog-title">{{ selectedDialog.title }}</strong>
                    <StatusDot
                      v-if="selectedDialogReport"
                      variant="accent"
                      :label="t('dashboard.reportReady')"
                    />
                    <StatusDot
                      v-if="progress.chatId === selectedDialog.id && isParseActive"
                      variant="info"
                      :label="statusLabel(progress.status)"
                    />
                  </div>
                  <span class="text-caption selection-subline">
                    {{ dialogTypeLabel(selectedDialog.type) }}
                    <template v-if="selectedDialogReport">
                      &bull; {{ t('dashboard.lastAnalyzed', { time: formatRelative(selectedDialogReport.parsedAt) }) }}
                    </template>
                  </span>
                </div>
              </div>
              <div class="selection-actions">
                <Button
                  variant="primary"
                  size="sm"
                  :loading="pending"
                  :disabled="selectedDialogDisabled"
                  @click="startSelectedDialogParse"
                >
                  {{ pending ? t('common.loading') : t('dashboard.analyze') }}
                </Button>
              </div>
            </div>

            <div class="selection-meta text-caption">
              <span v-if="!telegramSessionActive">{{ t('dashboard.sessionInactive') }}</span>
              <span v-else-if="isParseActive && progress.chatId !== selectedDialog.id">{{ t('dashboard.activeJobNotice') }}</span>
              <span v-else-if="selectedDialogCooldownLike">{{ t('dashboard.cooldownNotice') }}</span>
              <span v-else-if="selectedDialogReport">{{ t('dashboard.rerunHint') }}</span>
              <span v-else>{{ t('dashboard.firstReportHint') }}</span>
            </div>
          </div>

          <div v-if="!telegramSessionActive" class="info-banner warning-banner">
            {{ t('dashboard.sessionInactive') }}
          </div>

          <div v-else-if="parseDialogsLoading" class="list-grid">
            <div v-for="item in 6" :key="item" class="card-elevated dialog-skeleton">
              <Skeleton height="88px" radius="var(--radius-md)" />
            </div>
          </div>

          <div v-else-if="parseDialogsError" class="info-banner" :class="parseDialogsBusy ? 'warning-banner' : 'danger-banner'">
            {{ parseDialogsError }}
          </div>

          <div v-else class="stack-lg">
            <div v-if="visibleDialogs.length" class="dialog-list">
              <button
                v-for="(dialog, index) in visibleDialogs"
                :key="dialog.id"
                type="button"
                class="dialog-item stagger-item"
                :class="{ 'dialog-item-selected': selectedDialogId === dialog.id }"
                :style="{ '--delay': `${index * 35}ms` }"
                @click="selectDialog(dialog)"
              >
                <div class="dialog-main">
                  <ChatAvatar :chat-id="dialog.id" :title="dialog.title" :has-avatar="dialog.hasAvatar" />
                  <div class="dialog-copy">
                    <div class="dialog-title-row">
                      <span class="dialog-title">{{ dialog.title }}</span>
                      <StatusDot
                        v-if="dialogState(dialog)"
                        :variant="dialogState(dialog)?.variant ?? 'default'"
                        :label="dialogState(dialog)?.label ?? ''"
                      />
                    </div>
                    <span class="text-caption selection-subline">{{ dialogTypeLabel(dialog.type) }}</span>
                  </div>
                </div>
              </button>
            </div>
            <EmptyState
              v-else
              :title="t('dashboard.noChatsTitle')"
              :description="t('dashboard.noChatsDescription')"
            />

            <div v-if="hasMoreDialogs" class="more-row">
              <Button variant="secondary" @click="showMoreDialogs">{{ t('common.showMore') }}</Button>
            </div>
          </div>
        </section>

        <section class="stack-lg">
          <section class="card section-card">
            <div class="section-header">
              <div class="section-copy">
                <span class="text-label">{{ t('dashboard.analyzedLabel') }}</span>
                <h2 class="text-h2">{{ t('dashboard.analyzedTitle') }}</h2>
                <p class="text-body-sm section-text">{{ t('dashboard.analyzedText') }}</p>
              </div>
              <Badge variant="accent">{{ t('dashboard.readyCount', { count: formatNumber(analyzedChats.length) }) }}</Badge>
            </div>

            <div v-if="analyzedChats.length" class="analyzed-list">
              <div
                v-for="(chat, index) in analyzedChats"
                :key="chat.tgChatId"
                class="analyzed-card stagger-item"
                :style="{ '--delay': `${index * 45}ms` }"
              >
                <NuxtLink :to="`/chat/${chat.tgChatId}`" class="analyzed-link">
                  <div class="analyzed-head">
                    <div class="analyzed-meta">
                      <ChatAvatar :chat-id="chat.tgChatId" :title="chat.chatName || chat.tgChatId" />
                      <div class="dialog-copy">
                        <span class="dialog-title">{{ chat.chatName || chat.tgChatId }}</span>
                        <span class="text-caption selection-subline">{{ formatShortDate(chat.parsedAt) }}</span>
                      </div>
                    </div>
                    <span class="mono-value analyzed-count">{{ formatNumber(chat.totalMessages) }}</span>
                  </div>
                  <div class="analyzed-foot text-body-sm">
                    <span>{{ t('dashboard.sent') }} {{ formatNumber(chat.sentMessages) }}</span>
                    <span>{{ t('dashboard.recv') }} {{ formatNumber(chat.receivedMessages) }}</span>
                  </div>
                  <div class="text-caption mono-value">
                    {{ t('dashboard.lastAnalyzed', { time: formatRelative(chat.parsedAt) }) }}
                  </div>
                </NuxtLink>

                <div class="analyzed-actions">
                  <Button
                    variant="danger"
                    size="sm"
                    :loading="deletingChatId === chat.tgChatId"
                    @click="openDeleteReportConfirm(chat.tgChatId, chat.chatName || chat.tgChatId)"
                  >
                    {{ t('dashboard.deleteReport') }}
                  </Button>
                </div>
              </div>
            </div>

            <EmptyState
              v-else
              :title="t('dashboard.noParsedTitle')"
              :description="t('dashboard.noParsedDescription')"
            />
          </section>

          <section class="card section-card">
            <div class="section-header">
              <div class="section-copy">
                <span class="text-label">{{ t('dashboard.runHistoryLabel') }}</span>
                <h2 class="text-h2">{{ t('dashboard.runHistoryTitle') }}</h2>
                <p class="text-body-sm section-text">{{ t('dashboard.runHistoryText') }}</p>
              </div>
              <div class="section-actions">
                <Badge variant="default">{{ t('dashboard.jobsCount', { count: formatNumber(stats.history.length) }) }}</Badge>
              </div>
            </div>

            <div v-if="stats.history.length" class="history-layout">
              <div class="history-list">
                <div
                  v-for="(item, index) in latestHistoryItems"
                  :key="item.jobId"
                  class="history-row stagger-item"
                  :style="{ '--delay': `${index * 40}ms` }"
                >
                  <div class="history-row-head">
                    <div class="dialog-title-row">
                      <span class="history-title">{{ formatHistoryScope(item) }}</span>
                      <StatusDot :variant="statusVariant(item.status)" :label="statusLabel(item.status)" />
                    </div>
                  </div>
                  <div class="history-progress progress-bar">
                    <div class="progress-bar-fill" :style="{ width: `${historyProgress(item)}%` }" />
                  </div>
                  <div class="history-meta text-caption">
                    <span class="mono-value">{{ formatNumber(item.totalMessages) }} {{ t('common.messages') }}</span>
                    <span class="history-separator" aria-hidden="true" />
                    <span class="mono-value history-dates">{{ formatHistoryDates(item) }}</span>
                  </div>
                  <div v-if="shouldRenderHistoryError(item)" class="detail-error text-body-sm">
                    {{ item.errorMessage }}
                  </div>
                </div>
              </div>
            </div>

            <EmptyState
              v-else
              :title="t('dashboard.noJobsTitle')"
              :description="t('dashboard.noJobsDescription')"
            />
          </section>

          <section class="card section-card">
            <div class="section-copy">
              <span class="text-label">{{ t('dashboard.securityLabel') }}</span>
              <h2 class="text-h2">{{ t('dashboard.securityTitle') }}</h2>
              <p class="text-body-sm section-text">{{ t('dashboard.securityText') }}</p>
            </div>

            <div class="stack-md">
              <div v-if="!telegramSessionActive" class="info-banner warning-banner">
                {{ t('dashboard.sessionInactive') }}
              </div>

              <Button variant="secondary" size="lg" :loading="securityPending === 'telegram'" @click="openTerminateConfirm">
                {{ securityPending === 'telegram' ? t('dashboard.stopping') : t('dashboard.terminateTelegram') }}
              </Button>
              <Button variant="danger" size="lg" :loading="securityPending === 'account'" @click="openDeleteAccountConfirm">
                {{ securityPending === 'account' ? t('dashboard.deleting') : t('dashboard.deleteAccount') }}
              </Button>
              <Button v-if="!telegramSessionActive" variant="primary" size="lg" @click="logout">
                {{ t('common.relogin') }}
              </Button>
            </div>
          </section>
        </section>
      </div>

      <ConfirmDialog
        :open="Boolean(confirmState)"
        :title="confirmState?.title ?? ''"
        :description="confirmState?.description ?? ''"
        :confirm-label="confirmState?.confirmLabel ?? ''"
        :cancel-label="t('common.cancel')"
        :variant="confirmState?.variant ?? 'default'"
        :loading="confirmLoading"
        @close="confirmState = null"
        @confirm="confirmAction"
      />
    </div>
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

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: var(--space-6);
  min-width: 0;
}

.workspace-header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-6);
  padding: var(--space-5) var(--space-6);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background:
    radial-gradient(circle at top right, var(--accent-glow-soft), transparent 24%),
    linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-elevated) 100%);
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  max-width: 760px;
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

.source-actions {
  display: flex;
  min-width: 0;
}

.dialog-list,
.analyzed-list,
.list-grid,
.history-list {
  display: grid;
  gap: var(--space-3);
}

.dialog-skeleton {
  padding: 0;
  background: transparent;
  border: none;
}

.selection-card,
.dialog-item,
.analyzed-card,
.history-row {
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  transition: all var(--transition-fast);
}

.selection-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background:
    radial-gradient(circle at top right, var(--accent-glow-soft), transparent 30%),
    linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-elevated) 100%);
}

.selection-head,
.selection-main,
.selection-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.selection-head {
  justify-content: space-between;
}

.selection-main {
  min-width: 0;
  flex: 1;
}

.selection-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.selection-subline,
.selection-meta {
  color: var(--text-secondary);
}

.dialog-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.dialog-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 64px;
  padding: var(--space-3);
  min-width: 0;
  width: 100%;
  text-align: left;
  cursor: pointer;
}

.dialog-item:hover,
.dialog-item-selected,
.analyzed-card:hover,
.history-row:hover {
  border-color: var(--border-strong);
  background: var(--bg-overlay);
}

.dialog-item-selected {
  box-shadow: inset 0 0 0 1px var(--border-default);
}

.dialog-main {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
  flex: 1;
}

.dialog-copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
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

.analyzed-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
}

.analyzed-link {
  display: flex;
  flex-direction: column;
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

.analyzed-foot {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  color: var(--text-secondary);
}

.analyzed-foot span + span::before {
  content: '';
  display: inline-flex;
  width: 4px;
  height: 4px;
  margin-right: var(--space-2);
  border-radius: var(--radius-full);
  background: var(--text-tertiary);
  vertical-align: middle;
}

.analyzed-count {
  color: var(--text-tertiary);
}

.history-layout {
  min-width: 0;
}

.history-row {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
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
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .workspace-header,
  .selection-head,
  .selection-actions,
  .analyzed-head,
  .section-actions,
  .analyzed-actions,
  .dialog-item {
    flex-direction: column;
    align-items: stretch;
  }

  .section-header {
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

  .dialog-main,
  .selection-main {
    align-items: center;
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
}
</style>

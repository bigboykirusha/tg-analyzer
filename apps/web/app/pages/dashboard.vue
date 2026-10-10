<script setup lang="ts">
import type { ParseDialogDto } from '@tg-analyzer/shared'
import { isApiClientError } from '../composables/useApi'
import ChatAvatar from '../components/ChatAvatar.vue'
import Container from '../components/layout/Container.vue'
import ParseProgress from '../components/stats/ParseProgress.vue'
import Button from '../components/ui/Button.vue'
import ConfirmDialog from '../components/ui/ConfirmDialog.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import SegmentedControl from '../components/ui/SegmentedControl.vue'
import Skeleton from '../components/ui/Skeleton.vue'
import ListSkeleton from '../components/ui/ListSkeleton.vue'
import { AlertCircle, BarChart2, MessageSquare, Trash2, WifiOff } from '../lib/icons'
import { useI18n } from '../composables/useI18n'
import { useParseProgress } from '../composables/useParseProgress'
import { useStats } from '../composables/useStats'
import { useToast } from '../composables/useToast'
import authMiddleware from '../middleware/auth'
import { useAuthStore } from '../stores/auth'
import { useStatsStore } from '../stores/stats'

definePageMeta({
  layout: 'workspace',
  middleware: [authMiddleware],
})

const auth = useAuthStore()
const { deleteChat, fetchChats, fetchHistory, fetchParseDialogs } = useStats()
const stats = useStatsStore()
const { progress, bootstrapped, bootstrapFromServer, disconnect, reset } = useParseProgress()
const { t, formatNumber, formatDate: formatLocaleDate, formatRelative } = useI18n()
const toast = useToast()

const pending = ref(false)
const cancelling = ref(false)
const deletingChatId = ref<string | null>(null)
const ready = ref(stats.chatsLoaded && stats.parseDialogs.length > 0)
const parseDialogsLoading = ref(false)
const parseDialogsError = ref('')
const parseDialogsBusy = ref(false)
const dialogSearch = ref('')
const dialogFilter = ref<'all' | 'reported' | 'unreported'>('all')
const dialogFilterOptions = computed(() => [
  { value: 'all' as const, label: t('dashboard.filterAll') },
  { value: 'reported' as const, label: t('dashboard.filterReported') },
  { value: 'unreported' as const, label: t('dashboard.filterUnreported') },
])
const visibleDialogsCount = ref(18)
const loadMoreSentinel = ref<HTMLElement | null>(null)
let loadMoreObserver: IntersectionObserver | null = null
const pendingChatId = ref<string | null>(null)
const confirmState = ref<{
  type: 'delete-report'
  title: string
  description: string
  confirmLabel: string
  variant: 'default' | 'danger'
  chatId?: string
} | null>(null)

const analyzedChats = computed(() =>
  [...stats.chats]
    .filter((chat) => ['private', 'group'].includes(chat.chatType ?? ''))
    .sort((left, right) => new Date(right.parsedAt ?? 0).getTime() - new Date(left.parsedAt ?? 0).getTime()),
)
const analyzedChatIds = computed(() => new Set(analyzedChats.value.map((chat) => chat.tgChatId)))
const telegramSessionActive = computed(() => auth.telegramSessionActive)
const isParseActive = computed(() => progress.value.status === 'running' || progress.value.status === 'pending')
const isParseTerminal = computed(() => ['completed', 'failed', 'cancelled'].includes(progress.value.status))
const filteredDialogs = computed(() => {
  const query = dialogSearch.value.trim().toLowerCase()

  return stats.parseDialogs
    .filter((dialog) => ['private', 'group'].includes(dialog.type))
    .filter((dialog) => {
      if (dialogFilter.value === 'all') return true
      const hasReport = analyzedChatIds.value.has(dialog.id)
      return dialogFilter.value === 'reported' ? hasReport : !hasReport
    })
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
const activeHistoryJob = computed(
  () => stats.history.find((item) => item.status === 'running' || item.status === 'pending') ?? null,
)

async function loadParseDialogs() {
  parseDialogsLoading.value = stats.parseDialogs.length === 0
  parseDialogsError.value = ''
  parseDialogsBusy.value = false

  try {
    await fetchParseDialogs()
  } catch (error) {
    const isBusyError =
      typeof (error as { statusCode?: number } | null)?.statusCode === 'number' &&
      (error as { statusCode?: number }).statusCode === 409

    if (isBusyError) {
      parseDialogsBusy.value = true
      parseDialogsError.value = t('dashboard.dialogsBusy')
      return
    }

    parseDialogsError.value = t('dashboard.loadDialogsError')
  } finally {
    parseDialogsLoading.value = false
  }
}

async function refreshOperationalData() {
  await Promise.all([fetchHistory(), fetchChats()])
}

async function startParse(chatIds?: string[]) {
  if (pending.value || isParseActive.value) return
  pending.value = true
  pendingChatId.value = chatIds?.length === 1 ? (chatIds[0] ?? null) : null

  try {
    await useApiEndpoint('POST /api/v1/parse/start', {
      body: chatIds?.length ? { chatIds } : {},
    })
    progress.value = {
      current: 0, total: chatIds?.length ?? 0,
      chatId: chatIds?.length === 1 ? chatIds[0]! : null,
      chatName: stats.parseDialogs.find((dialog) => dialog.id === chatIds?.[0])?.title ?? '',
      status: 'pending', message: '', scannedMessages: 0, startTime: Date.now(),
    }
    await bootstrapFromServer()
    await fetchHistory()
  } catch (error) {
    const apiError = isApiClientError(error) ? error : null
    const retryAfter = apiError?.data?.retryAfter
    const code = apiError?.code ?? (typeof apiError?.data?.code === 'string' ? apiError.data.code : undefined)

    if (apiError?.statusCode === 409) {
      if (code === 'TELEGRAM_SESSION_BUSY') {
        toast.warning(t('dashboard.startError'), apiError.message || t('dashboard.cancelParse'))
      } else {
        toast.info(t('dashboard.activeParse'), apiError.message || t('dashboard.cancelParse'))
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
    await useApiEndpoint('DELETE /api/v1/parse/cancel')

    disconnect()
    reset()

    await Promise.all([fetchHistory(), bootstrapFromServer()])

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

async function revealMoreDialogs() {
  if (!hasMoreDialogs.value) return
  visibleDialogsCount.value += 18
  await nextTick()

  const sentinel = loadMoreSentinel.value
  if (hasMoreDialogs.value && sentinel && sentinel.getBoundingClientRect().top < window.innerHeight + 240) {
    requestAnimationFrame(() => void revealMoreDialogs())
  }
}

watch([dialogSearch, dialogFilter], () => {
  visibleDialogsCount.value = 18
})

watch(loadMoreSentinel, (next, previous) => {
  if (previous) loadMoreObserver?.unobserve(previous)
  if (next) loadMoreObserver?.observe(next)
})

onMounted(() => {
  loadMoreObserver = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void revealMoreDialogs()
    },
    { rootMargin: '240px 0px' },
  )
  if (loadMoreSentinel.value) loadMoreObserver.observe(loadMoreSentinel.value)
})

onBeforeUnmount(() => loadMoreObserver?.disconnect())

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

function getDialogReport(dialog: ParseDialogDto) {
  return analyzedChatMap.value.get(dialog.id) ?? null
}

function dialogParseDisabled(dialog: ParseDialogDto) {
  return !telegramSessionActive.value || pending.value || isParseActive.value || pendingChatId.value === dialog.id
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

async function confirmAction() {
  if (!confirmState.value) {
    return
  }

  if (confirmState.value.chatId) {
    await handleDeleteReport(confirmState.value.chatId)
  }
}

const confirmLoading = computed(() => {
  if (!confirmState.value) {
    return false
  }
  if (confirmState.value.type === 'delete-report') {
    return deletingChatId.value === confirmState.value.chatId
  }
  return false
})

watch([dialogSearch, dialogFilter], () => {
  visibleDialogsCount.value = 18
})

watch(isParseActive, async (active, wasActive) => {
  if (!bootstrapped.value) {
    return
  }

  if (!active && wasActive) {
    await refreshOperationalData().catch(() => undefined)
  }
})

watch(isParseTerminal, async (terminal) => {
  if (!bootstrapped.value || !terminal) {
    return
  }

  await refreshOperationalData().catch(() => undefined)
})

watch(
  () => progress.value.status,
  (status, previousStatus) => {
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
  },
)

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
    <Container size="default">
      <div v-if="!ready" class="page-stack" aria-busy="true">
        <div class="dashboard-grid">
          <section class="card section-card workspace-card">
            <div class="stack-md">
              <Skeleton height="24px" width="160px" />
              <Skeleton height="44px" radius="var(--radius-full)" />
              <ListSkeleton :rows="6" />
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
        </div>
      </div>

      <div v-else class="page-stack">
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
          cancellable
          :cancelling="cancelling"
          @cancel="cancelActiveParse"
        />

        <div class="dashboard-grid">
          <section class="card section-card workspace-card">
            <div class="source-actions">
              <input v-model="dialogSearch" type="text" class="input" :placeholder="t('dashboard.search')" />
            </div>

            <SegmentedControl
              v-model="dialogFilter"
              :options="dialogFilterOptions"
              :aria-label="t('dashboard.sourceTitle')"
            />

            <div v-if="!telegramSessionActive" class="info-banner warning-banner">
              {{ t('dashboard.sessionInactive') }}
            </div>

            <ListSkeleton v-else-if="parseDialogsLoading" :rows="6" aria-busy="true" />

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
                <div
                  v-for="(dialog, index) in visibleDialogs"
                  :key="dialog.id"
                  class="dialog-item"
                  :class="{ 'dialog-item-active': progress.chatId === dialog.id && isParseActive }"
                  :style="{ '--delay': `${index * 35}ms` }"
                >
                  <NuxtLink
                    v-if="getDialogReport(dialog)"
                    :to="`/chat/${dialog.id}`"
                    class="dialog-main dialog-main-link"
                  >
                    <ChatAvatar :chat-id="dialog.id" :title="dialog.title" :has-avatar="dialog.hasAvatar" />
                    <div class="dialog-copy">
                      <div class="dialog-title-row">
                        <span class="dialog-title">{{ dialog.title }}</span>
                      </div>
                      <div class="dialog-meta t-small">
                        <span class="t-small selection-subline">{{
                          t('dashboard.lastAnalyzed', { time: formatRelative(getDialogReport(dialog)?.parsedAt) })
                        }}</span>
                      </div>
                    </div>
                  </NuxtLink>
                  <div v-else class="dialog-main">
                    <ChatAvatar :chat-id="dialog.id" :title="dialog.title" :has-avatar="dialog.hasAvatar" />
                    <div class="dialog-copy">
                      <div class="dialog-title-row">
                        <span class="dialog-title">{{ dialog.title }}</span>
                      </div>
                      <div class="dialog-meta t-small">
                        <span class="t-small selection-subline">{{ dialogTypeLabel(dialog.type) }}</span>
                      </div>
                    </div>
                  </div>

                  <div class="dialog-actions">
                    <template v-if="getDialogReport(dialog)">
                      <Button variant="primary" size="md" class="dialog-action-button" :to="`/chat/${dialog.id}`">
                        {{ t('common.report') }}
                      </Button>
                    </template>
                    <Button
                      v-else
                      variant="secondary"
                      size="md"
                      class="dialog-action-button"
                      :loading="pendingChatId === dialog.id"
                      :disabled="dialogParseDisabled(dialog)"
                      @click="startDialogParse(dialog)"
                    >
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

              <div v-if="hasMoreDialogs" ref="loadMoreSentinel" class="dialog-load-sentinel" aria-live="polite">
                <span class="dialog-load-indicator" aria-hidden="true" />
                <span class="t-small">{{
                  t('dashboard.dialogsShown', {
                    visible: formatNumber(visibleDialogs.length),
                    total: formatNumber(filteredDialogs.length),
                  })
                }}</span>
              </div>
            </div>
          </section>

          <section class="card section-card workspace-card">
            <div class="section-header">
              <div class="section-copy">
                <span class="t-label">{{ t('dashboard.analyzedLabel') }}</span>
                <h2 class="t-h2">{{ t('dashboard.analyzedTitle') }}</h2>
                <p class="t-small section-text">{{ t('dashboard.analyzedText') }}</p>
              </div>
            </div>

            <div v-if="analyzedChats.length" class="analyzed-list">
              <div
                v-for="(chat, index) in analyzedChats"
                :key="chat.tgChatId"
                class="analyzed-card stagger-item"
                :style="{ '--delay': `${index * 45}ms` }"
              >
                <NuxtLink :to="`/chat/${chat.tgChatId}`" class="analyzed-link">
                  <ChatAvatar :chat-id="chat.tgChatId" :title="chat.chatName || chat.tgChatId" />
                  <div class="dialog-copy">
                    <div class="dialog-title-row">
                      <span class="dialog-title">{{ chat.chatName || chat.tgChatId }}</span>
                    </div>
                    <div class="analyzed-foot t-small">
                      <span class="selection-subline">{{ formatShortDate(chat.parsedAt) }}</span>
                    </div>
                  </div>
                </NuxtLink>

                <div class="analyzed-actions">
                  <Button
                    variant="ghost"
                    size="sm"
                    class="delete-btn"
                    :icon="Trash2"
                    icon-only
                    :aria-label="t('dashboard.deleteReport')"
                    :loading="deletingChatId === chat.tgChatId"
                    @click="openDeleteReportConfirm(chat.tgChatId, chat.chatName || chat.tgChatId)"
                  />
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
    </Container>
</template>

<style scoped>
.page-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.workspace-intro {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-8);
  min-height: 180px;
  padding: clamp(var(--space-5), 3vw, var(--space-8)) clamp(var(--space-5), 4vw, var(--space-10));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background: var(--glass);
  color: var(--text-primary);
  box-shadow: var(--shadow);
  backdrop-filter: blur(24px) saturate(1.4);
  overflow: hidden;
}

.workspace-intro-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-3);
}

.workspace-intro-copy .t-label {
  color: var(--text-muted);
}

.workspace-intro-copy .t-display {
  font-size: clamp(44px, 7vw, 76px);
}

.workspace-intro-copy p {
  max-width: 610px;
  color: var(--text-secondary);
}

.workspace-signal {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  width: min(32%, 250px);
  height: 94px;
  transform: translateY(8px);
}

.workspace-signal span {
  flex: 1;
  border-radius: 999px 999px 4px 4px;
  background: var(--accent);
}

.workspace-signal span:nth-child(1) {
  height: 28%;
}
.workspace-signal span:nth-child(2) {
  height: 46%;
}
.workspace-signal span:nth-child(3) {
  height: 76%;
  background: var(--accent-2);
}
.workspace-signal span:nth-child(4) {
  height: 54%;
}
.workspace-signal span:nth-child(5) {
  height: 92%;
}
.workspace-signal span:nth-child(6) {
  height: 66%;
  background: var(--accent-2);
}
.workspace-signal span:nth-child(7) {
  height: 38%;
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
  grid-template-columns: minmax(0, 1fr);
  gap: var(--space-6);
  min-width: 0;
  align-items: start;
}

.dashboard-grid > :not(:first-child) {
  display: none;
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
  border-color: var(--warning);
  background: var(--warning-subtle);
  color: var(--warning);
}

.danger-banner {
  border-color: var(--danger);
  background: var(--danger-subtle);
  color: var(--danger);
}

.info-banner-tone {
  border-color: var(--info);
  background: var(--info-subtle);
  color: var(--info);
}

.section-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  min-width: 0;
}

.workspace-card {
  border-color: var(--border-default);
  box-shadow: none;
}

.source-actions {
  display: flex;
  min-width: 0;
}

.dialog-list,
.analyzed-list,
.list-grid {
  display: grid;
  gap: 0;
  border-top: 1px solid var(--border-subtle);
}

.dialog-item,
.analyzed-card {
  border: 0;
  border-bottom: 1px solid var(--border-subtle);
  border-radius: 0;
  background: transparent;
  transition:
    transform var(--transition-fast),
    opacity var(--transition-fast);
}

.dialog-item:last-child,
.analyzed-card:last-child {
  border-bottom: 0;
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
.analyzed-card:hover {
  border-color: var(--border-subtle);
  background: color-mix(in srgb, var(--accent-subtle) 45%, transparent);
}

.dialog-item-active {
  box-shadow: inset 3px 0 0 var(--accent);
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
  gap: var(--space-1);
}

.dialog-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  flex-wrap: wrap;
  flex: 0 0 auto;
}

.dialog-actions :deep(.btn) {
  min-height: 36px;
  height: 36px;
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

.dialog-action-button {
  min-width: 104px;
  white-space: nowrap;
}

.dialog-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dialog-load-sentinel {
  display: flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  color: var(--text-muted);
}

.dialog-load-indicator {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: var(--accent);
  box-shadow: 0 0 0 4px var(--accent-subtle);
  animation: load-pulse 1.2s ease-in-out infinite;
}

@keyframes load-pulse {
  50% {
    opacity: 0.45;
    transform: scale(0.8);
  }
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
.section-actions,
.analyzed-actions,
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.section-actions,
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
  color: var(--danger);
}

.analyzed-count {
  color: var(--text-tertiary);
}

.dashboard-side-column {
  min-width: 0;
}

.analyzed-foot,
.analyzed-foot .selection-subline {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-error {
  border: 1px solid var(--danger);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  background: var(--danger-subtle);
  color: var(--danger);
  overflow-wrap: anywhere;
}

@media (max-width: 900px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .workspace-intro {
    min-height: 160px;
    align-items: flex-start;
    padding: var(--space-5);
    border-radius: var(--radius-lg);
  }

  .workspace-intro-copy .t-display {
    font-size: 44px;
  }

  .workspace-intro-copy p {
    font-size: 14px;
  }

  .workspace-signal {
    width: 82px;
    height: 70px;
    flex: 0 0 auto;
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
  .analyzed-card {
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
    grid-template-columns: minmax(0, 1fr) 112px;
    align-items: center;
    gap: var(--space-3);
    min-height: unset;
    padding: var(--space-3);
  }

  .dialog-main {
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    gap: var(--space-2);
  }

  .dialog-copy {
    gap: var(--space-1);
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
    width: 112px;
    display: flex;
  }

  .dialog-action-button {
    min-height: 44px;
    height: 44px;
    width: 100%;
    padding: 0 var(--space-4);
  }

  .dialog-actions :deep(.btn) {
    min-height: 44px;
    height: 44px;
  }

  .dialog-action-button {
    width: 100%;
    min-width: 0;
  }

  .analyzed-foot {
    gap: var(--space-1);
  }

  .analyzed-foot .selection-subline,
  .analyzed-foot .selection-subline {
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
  }

  .detail-error {
    padding: var(--space-2);
    font-size: 12px;
  }

}
</style>

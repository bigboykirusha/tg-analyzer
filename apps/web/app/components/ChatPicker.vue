<script setup lang="ts">
import { AlertCircle, Info, MessageSquare, Search, WifiOff, X } from '../lib/icons'

/**
 * The user's Telegram chats with search, a private/group filter and the
 * «Анализ» button on every row. Runs and cancels analyses and deletes reports.
 * `sticky` pins the search bar under the header (the «New analysis» page).
 */
withDefaults(defineProps<{ sticky?: boolean }>(), { sticky: false })

const PAGE_SIZE = 30

const { t, tc } = useI18n()
const auth = useAuthStore()
const workspace = useWorkspaceStore()
const analysis = useAnalysis()
const toast = useToast()
const errorMessage = useErrorMessage()

const search = ref('')
const filter = ref<'all' | 'private' | 'groups'>('all')
const visibleCount = ref(PAGE_SIZE)
const startingChatId = ref<string | null>(null)
const cancelling = ref(false)
const confirmCancelOpen = ref(false)
const deleteChatId = ref<string | null>(null)
const deleting = ref(false)
const sentinel = ref<HTMLElement | null>(null)

const filterOptions = computed(() => [
  { value: 'all' as const, label: t('dashboard.filter.all') },
  { value: 'private' as const, label: t('dashboard.filter.private') },
  { value: 'groups' as const, label: t('dashboard.filter.groups') },
])

const filteredChats = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return workspace.chats.filter((chat) => {
    if (filter.value === 'private' && chat.type !== 'private') return false
    if (filter.value === 'groups' && chat.type === 'private') return false
    return !query || chat.title.toLocaleLowerCase().includes(query)
  })
})
const visibleChats = computed(() => filteredChats.value.slice(0, visibleCount.value))

const firstLoad = computed(
  () => !workspace.chats.length && (workspace.dialogsState === 'loading' || workspace.dialogsState === 'idle'),
)
const dialogsFailed = computed(() => workspace.dialogsState === 'error' && !workspace.dialogs.length)
// Analyses queue up, so another running one does not block starting more.
const analysisBlocked = computed(() => !auth.telegramSessionActive || startingChatId.value !== null)
const queuedJobs = computed(() => new Map(analysis.queued.value.map((item) => [item.chatId, item.jobId])))

watch([search, filter], () => {
  visibleCount.value = PAGE_SIZE
})

useIntersection(sentinel, () => {
  if (visibleCount.value < filteredChats.value.length) visibleCount.value += PAGE_SIZE
})

async function analyse(chatId: string, title: string) {
  startingChatId.value = chatId
  try {
    await analysis.startAnalysis(chatId, title)
  } catch (error) {
    toast.error(t('analysis.startError'), errorMessage(error))
  } finally {
    startingChatId.value = null
  }
}

/** 0–1 when Telegram reported the chat size. */
const progressFraction = computed(() => {
  const { scannedMessages, totalMessages, phase } = analysis.progress.value
  if (phase === 'saving') return 1
  if (!totalMessages || phase !== 'scanning') return null
  return Math.min(1, scannedMessages / totalMessages)
})

// Cancelling asks for confirmation only once more than 30 s of reading would be lost.
const CONFIRM_CANCEL_AFTER_MS = 30_000
function requestCancel() {
  const { startedAt } = analysis.progress.value
  if (startedAt && Date.now() - startedAt > CONFIRM_CANCEL_AFTER_MS) confirmCancelOpen.value = true
  else void cancel()
}

async function deleteReport() {
  const chatId = deleteChatId.value
  if (!chatId) return
  deleting.value = true
  try {
    await workspace.deleteReport(chatId)
    toast.success(t('report.deleted'))
  } catch (error) {
    toast.error(t('report.deleteError'), errorMessage(error))
  } finally {
    deleting.value = false
    deleteChatId.value = null
  }
}

async function cancel() {
  confirmCancelOpen.value = false
  cancelling.value = true
  try {
    await analysis.cancel()
  } catch (error) {
    toast.error(t('analysis.cancelError'), errorMessage(error))
  } finally {
    cancelling.value = false
  }
}

onMounted(() => {
  void workspace.loadDialogs()
})
</script>

<template>
  <div class="picker" :class="{ 'picker--sticky': sticky }">
    <div class="picker-tools">
      <label class="input input--raised">
        <Search aria-hidden="true" />
        <input
          v-model="search"
          type="search"
          class="input__control"
          :placeholder="t('dashboard.search')"
          :aria-label="t('dashboard.search')"
        />
        <button v-if="search" type="button" class="input__clear" :aria-label="t('common.clear')" @click="search = ''">
          <X aria-hidden="true" />
        </button>
      </label>
      <UiSegmentedControl
        v-model="filter"
        inline
        class="picker-filter"
        :options="filterOptions"
        :aria-label="t('dashboard.filter.label')"
      />
    </div>

    <div v-if="auth.telegramSessionActive && workspace.dialogsStale" class="banner banner--info" role="status">
      <Info aria-hidden="true" />
      <div class="banner__copy">
        <span class="banner__text">{{ t('dashboard.staleDialogs') }}</span>
      </div>
    </div>

    <UiListSkeleton v-if="firstLoad" :rows="6" />

    <UiEmptyState
      v-else-if="dialogsFailed"
      class="panel"
      tone="danger"
      :icon="workspace.dialogsError?.code === 'TELEGRAM_BUSY' ? WifiOff : AlertCircle"
      :title="t('dashboard.dialogsError')"
      :description="errorMessage(workspace.dialogsError)"
    >
      <template #action>
        <UiButton variant="secondary" @click="workspace.loadDialogs()">{{ t('common.retry') }}</UiButton>
      </template>
    </UiEmptyState>

    <template v-else>
      <div v-if="visibleChats.length" class="chat-list">
        <ChatRow
          v-for="chat in visibleChats"
          :key="chat.id"
          :chat="chat"
          :analysing="analysis.isActive.value && analysis.progress.value.chatId === chat.id"
          :progress="progressFraction"
          :paused="analysis.progress.value.phase === 'waiting'"
          :queued="queuedJobs.has(chat.id)"
          :starting="startingChatId === chat.id"
          :cancelling="cancelling"
          :disabled="analysisBlocked"
          @analyse="analyse(chat.id, chat.title)"
          @cancel="queuedJobs.has(chat.id) ? analysis.cancel(queuedJobs.get(chat.id)) : requestCancel()"
          @delete="deleteChatId = chat.id"
        />
      </div>
      <UiEmptyState
        v-else
        class="panel"
        :icon="MessageSquare"
        :title="search || filter !== 'all' ? t('dashboard.noMatchesTitle') : t('dashboard.emptyTitle')"
        :description="search || filter !== 'all' ? t('dashboard.noMatchesText') : t('dashboard.emptyText')"
      />

      <p
        v-if="visibleChats.length < filteredChats.length"
        :key="visibleCount"
        ref="sentinel"
        class="list-footer t-small"
      >
        {{ t('dashboard.shown', { shown: visibleChats.length, total: filteredChats.length }) }}
      </p>
      <p v-else-if="workspace.dialogsTruncated" class="list-footer t-small">{{ t('dashboard.truncated') }}</p>
      <p v-else-if="filteredChats.length" class="list-footer t-small">
        {{ tc('dashboard.chatCount', filteredChats.length) }}
      </p>
    </template>
  </div>

  <UiConfirmDialog
    :open="confirmCancelOpen"
    :title="t('analysis.cancelTitle')"
    :description="t('analysis.cancelText')"
    :confirm-label="t('analysis.cancel')"
    :cancel-label="t('analysis.keepGoing')"
    variant="danger"
    :loading="cancelling"
    @close="confirmCancelOpen = false"
    @confirm="cancel"
  />
  <DeleteReportDialog
    :open="deleteChatId !== null"
    :report="workspace.reports.find((report) => report.chatId === deleteChatId) ?? null"
    :loading="deleting"
    @close="deleteChatId = null"
    @confirm="deleteReport"
  />
</template>

<style scoped>
.picker {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-3);
}

.picker-tools {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
}

/* On its own page the search stays in reach while the list scrolls. */
.picker--sticky .picker-tools {
  position: sticky;
  top: var(--topbar-height);
  z-index: calc(var(--z-header) - 1);
  margin-inline: calc(var(--page-gutter) * -1);
  padding: var(--space-2) var(--page-gutter);
  background: var(--bg);
}

/* No overflow clipping: row menus float outside the list. */
.chat-list {
  padding: var(--space-1) 0;
  border-radius: var(--radius-card);
  background: var(--surface);
}

.list-footer {
  color: var(--text-muted);
  text-align: center;
}

@media (max-width: 640px) {
  .picker-tools {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-2);
  }
}
</style>

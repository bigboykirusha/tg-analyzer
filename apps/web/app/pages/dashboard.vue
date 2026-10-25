<script setup lang="ts">
import { AlertCircle, AlertTriangle, BarChart2, Info, Lock, MessageSquare, Search, WifiOff, X } from '../lib/icons'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

const PAGE_SIZE = 30
/** Report cards shown before «All reports». */
const REPORTS_PREVIEW = 6

const { t, tc } = useI18n()
useSeoMeta({ title: () => t('dashboard.title') })

const auth = useAuthStore()
const workspace = useWorkspaceStore()
const analysis = useAnalysis()
const { logout } = useAuth()
const toast = useToast()
const errorMessage = useErrorMessage()

const search = ref('')
const filter = ref<'all' | 'private' | 'groups'>('all')
const showAllReports = ref(false)
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

/** Finished reports, newest first: what the user has already learned. */
const reports = computed(() =>
  workspace.chats
    .filter((chat) => chat.report)
    .sort((left, right) => Date.parse(right.report!.analyzedAt) - Date.parse(left.report!.analyzedAt)),
)
const shownReports = computed(() =>
  showAllReports.value ? reports.value : reports.value.slice(0, REPORTS_PREVIEW),
)
/** At least two private reports: compare the people side by side. */
const privateReports = computed(() =>
  reports.value.filter((chat) => chat.type === 'private' && chat.report?.headline).map((chat) => chat.report!),
)
const avatars = computed(() => new Map(workspace.chats.map((chat) => [chat.id, chat.hasAvatar])))

/** Newcomers see how it works until the first report exists. */
const showIntro = computed(
  () => workspace.reportsState !== 'loading' && !reports.value.length && !analysis.isActive.value,
)
const introSteps = computed(() => [
  { icon: MessageSquare, title: t('dashboard.intro.step1Title'), text: t('dashboard.intro.step1Text') },
  { icon: Lock, title: t('dashboard.intro.step2Title'), text: t('dashboard.intro.step2Text') },
  { icon: BarChart2, title: t('dashboard.intro.step3Title'), text: t('dashboard.intro.step3Text') },
])
function isUpdating(chatId: string) {
  return (analysis.isActive.value && analysis.progress.value.chatId === chatId) || queuedJobs.value.has(chatId)
}
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
  void workspace.loadReports().catch((error) => toast.error(t('dashboard.reportsError'), errorMessage(error)))
})
</script>

<template>
  <UiPageContainer>
    <div class="dashboard">
      <header class="dashboard-head">
        <h1 class="t-h1">{{ t('dashboard.title') }}</h1>
      </header>

      <div v-if="!auth.telegramSessionActive" class="banner banner--warning" role="status">
        <AlertTriangle aria-hidden="true" />
        <div class="banner__copy">
          <span class="banner__title">{{ t('dashboard.sessionInactive') }}</span>
        </div>
        <div class="banner__actions">
          <UiButton variant="secondary" size="sm" @click="logout">{{ t('common.relogin') }}</UiButton>
        </div>
      </div>

      <section v-if="reports.length" class="dashboard-section" aria-labelledby="reports-title">
        <div class="dashboard-section__head">
          <h2 id="reports-title" class="dashboard-section__title">{{ t('dashboard.reportsTitle') }}</h2>
          <UiButton
            v-if="reports.length > REPORTS_PREVIEW"
            variant="ghost"
            size="sm"
            @click="showAllReports = !showAllReports"
          >
            {{ showAllReports ? t('dashboard.showFewerReports') : t('dashboard.showAllReports', { count: reports.length }) }}
          </UiButton>
        </div>
        <div class="report-cards">
          <ReportCard
            v-for="chat in shownReports"
            :key="chat.id"
            :report="chat.report!"
            :has-avatar="chat.hasAvatar"
            :updating="isUpdating(chat.id)"
          />
        </div>
      </section>

      <section v-if="privateReports.length >= 2" class="dashboard-section" aria-labelledby="people-title">
        <div class="dashboard-section__head">
          <div class="dashboard-section__copy">
            <h2 id="people-title" class="dashboard-section__title">{{ t('people.title') }}</h2>
            <p class="dashboard-section__hint">{{ t('people.hint') }}</p>
          </div>
        </div>
        <PeopleTable :reports="privateReports" :avatars="avatars" />
      </section>

      <section v-if="!reports.length && showIntro" class="intro" aria-labelledby="intro-title">
        <h2 id="intro-title" class="dashboard-section__title">{{ t('dashboard.intro.title') }}</h2>
        <ol class="intro__steps">
          <li v-for="(step, index) in introSteps" :key="index" class="intro__step">
            <span class="icon-tile icon-tile--accent" aria-hidden="true"><component :is="step.icon" /></span>
            <span class="intro__copy">
              <strong>{{ index + 1 }}. {{ step.title }}</strong>
              <span>{{ step.text }}</span>
            </span>
          </li>
        </ol>
      </section>

      <section class="dashboard-section" aria-labelledby="chats-title">
        <div class="dashboard-section__head">
          <div class="dashboard-section__copy">
            <h2 id="chats-title" class="dashboard-section__title">{{ t('dashboard.chatsTitle') }}</h2>
            <p class="dashboard-section__hint">{{ t('dashboard.chatsHint') }}</p>
          </div>
        </div>

        <div class="dashboard-tools">
          <label class="input">
            <Search aria-hidden="true" />
            <input
              v-model="search"
              type="search"
              class="input__control"
              :placeholder="t('dashboard.search')"
              :aria-label="t('dashboard.search')"
            />
            <button
              v-if="search"
              type="button"
              class="input__clear"
              :aria-label="t('common.clear')"
              @click="search = ''"
            >
              <X aria-hidden="true" />
            </button>
          </label>
          <UiSegmentedControl
            v-model="filter"
            class="dashboard-filter"
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
      </section>
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
    <UiConfirmDialog
      :open="deleteChatId !== null"
      :title="t('report.deleteTitle')"
      :description="t('report.deleteText')"
      :confirm-label="t('report.delete')"
      variant="danger"
      :loading="deleting"
      @close="deleteChatId = null"
      @confirm="deleteReport"
    />
  </UiPageContainer>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: var(--space-10);
}

.dashboard-head {
  margin-bottom: calc(var(--space-4) * -1);
}

.dashboard-section {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-4);
}

.dashboard-section__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
}

.dashboard-section__copy {
  display: grid;
  gap: var(--space-1);
}

.dashboard-section__title {
  font: var(--text-h2);
  font-size: 20px;
  line-height: 28px;
  letter-spacing: -0.01em;
}

.dashboard-section__hint {
  color: var(--text-muted);
  font: var(--text-small);
}

.report-cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-4);
}

.intro {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-6);
  border: 1px solid var(--accent-border);
  border-radius: var(--radius-lg);
  background: var(--accent-subtle);
}

.intro__steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-5);
  list-style: none;
}

.intro__step {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.intro__step .icon-tile {
  background: var(--surface);
}

.intro__copy {
  display: grid;
  gap: 2px;
  font: var(--text-small);
  color: var(--text-muted);
}

.intro__copy strong {
  color: var(--text);
  font: var(--text-ui);
  font-weight: 600;
}

.dashboard-tools {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 340px);
  gap: var(--space-3);
}

/* No overflow clipping: row menus float outside the list. */
.chat-list {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
}

.chat-list :deep(.chat-row:first-child) {
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
}

.chat-list :deep(.chat-row:last-child) {
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

.chat-list :deep(.chat-row:only-child) {
  border-radius: var(--radius-lg);
}

.list-footer {
  color: var(--text-muted);
  text-align: center;
}

@media (max-width: 900px) {
  .report-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .intro__steps {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-4);
  }
}

@media (max-width: 640px) {
  .dashboard {
    gap: var(--space-8);
  }

  .dashboard-tools {
    grid-template-columns: minmax(0, 1fr);
  }

  .intro {
    padding: var(--space-5);
  }

  /* Phones: report cards scroll sideways instead of pushing the chat list down. */
  .report-cards {
    display: flex;
    margin-inline: calc(var(--page-gutter) * -1);
    padding: 2px var(--page-gutter) var(--space-2);
    overflow-x: auto;
    scroll-padding-inline: var(--page-gutter);
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }

  .report-cards::-webkit-scrollbar {
    display: none;
  }

  .report-cards > * {
    flex: 0 0 min(260px, 75%);
    scroll-snap-align: start;
  }
}
</style>

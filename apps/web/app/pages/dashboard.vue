<script setup lang="ts">
import { AlertCircle, MessageSquare, WifiOff } from '../lib/icons'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

const PAGE_SIZE = 30

const { t, tc } = useI18n()
useSeoMeta({ title: () => t('nav.chats') })

const auth = useAuthStore()
const workspace = useWorkspaceStore()
const analysis = useAnalysis()
const { logout } = useAuth()
const toast = useToast()
const errorMessage = useErrorMessage()

const search = ref('')
const filter = ref<'all' | 'reported' | 'new'>('all')
const visibleCount = ref(PAGE_SIZE)
const startingChatId = ref<string | null>(null)
const cancelling = ref(false)
const sentinel = ref<HTMLElement | null>(null)

const filterOptions = computed(() => [
  { value: 'all' as const, label: t('dashboard.filter.all') },
  { value: 'reported' as const, label: t('dashboard.filter.reported') },
  { value: 'new' as const, label: t('dashboard.filter.new') },
])

const filteredChats = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return workspace.chats.filter((chat) => {
    if (filter.value === 'reported' && !chat.report) return false
    if (filter.value === 'new' && chat.report) return false
    return !query || chat.title.toLocaleLowerCase().includes(query)
  })
})
const visibleChats = computed(() => filteredChats.value.slice(0, visibleCount.value))
const firstLoad = computed(
  () => !workspace.chats.length && (workspace.dialogsState === 'loading' || workspace.dialogsState === 'idle'),
)
const dialogsFailed = computed(() => workspace.dialogsState === 'error' && !workspace.dialogs.length)
const analysisBlocked = computed(
  () => !auth.telegramSessionActive || analysis.isActive.value || startingChatId.value !== null,
)

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

async function cancel() {
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
    <div class="stack stack--lg">
      <header class="dashboard-header">
        <div class="section-copy">
          <h1 class="t-h1">{{ t('dashboard.title') }}</h1>
          <p class="t-body">{{ t('dashboard.subtitle') }}</p>
        </div>
      </header>

      <AnalysisProgress
        v-if="analysis.isActive.value"
        :progress="analysis.progress.value"
        :cancelling="cancelling"
        @cancel="cancel"
      />

      <section class="card dashboard-card">
        <div class="dashboard-tools">
          <input
            v-model="search"
            type="search"
            class="input"
            :placeholder="t('dashboard.search')"
            :aria-label="t('dashboard.search')"
          />
          <UiSegmentedControl v-model="filter" :options="filterOptions" :aria-label="t('dashboard.filter.label')" />
        </div>

        <div v-if="!auth.telegramSessionActive" class="banner banner--warning">
          <span>{{ t('dashboard.sessionInactive') }}</span>
          <UiButton variant="secondary" size="sm" @click="logout">{{ t('common.relogin') }}</UiButton>
        </div>
        <div v-else-if="workspace.dialogsStale" class="banner banner--info">{{ t('dashboard.staleDialogs') }}</div>

        <UiListSkeleton v-if="firstLoad" :rows="6" />

        <UiEmptyState
          v-else-if="dialogsFailed"
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
              :starting="startingChatId === chat.id"
              :disabled="analysisBlocked"
              @analyse="analyse(chat.id, chat.title)"
            />
          </div>
          <UiEmptyState
            v-else
            :icon="MessageSquare"
            :title="search ? t('dashboard.noMatchesTitle') : t('dashboard.emptyTitle')"
            :description="search ? t('dashboard.noMatchesText') : t('dashboard.emptyText')"
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
  </UiPageContainer>
</template>

<style scoped>
.dashboard-header {
  padding-inline: var(--space-1);
}

.dashboard-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.dashboard-tools {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.chat-list {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--surface) 60%, transparent);
}

.list-footer {
  color: var(--text-muted);
  text-align: center;
}

@media (max-width: 768px) {
  .dashboard-header {
    padding-inline: var(--space-2);
  }
}
</style>

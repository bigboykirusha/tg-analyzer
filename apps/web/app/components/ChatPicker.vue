<script setup lang="ts">
import { AlertCircle, MessageSquare, Search, WifiOff } from '../lib/icons'

/**
 * A searchable list of Telegram chats. The dedicated picker puts chats ready for a new report first and keeps
 * reports already made in their own group. Each group follows Telegram's order.
 */
const props = defineProps<{ standalone?: boolean }>()

const PAGE_SIZE = 30
const { t, tc } = useI18n()
const auth = useAuthStore()
const workspace = useWorkspaceStore()
const errorMessage = useErrorMessage()
const { relogin } = useAuth()

const search = ref('')
const query = computed(() => search.value.trim().toLocaleLowerCase())
const searchInput = useTemplateRef<{ focus: () => void }>('searchInput')
const visibleCount = ref(PAGE_SIZE)
const sentinel = ref<HTMLElement | null>(null)
const matching = computed(() =>
  workspace.chats
    .filter((chat) => !query.value || chat.title.toLocaleLowerCase().includes(query.value))
    .sort(
      (left, right) =>
        Number(Boolean(right.pinned)) - Number(Boolean(left.pinned)) ||
        (right.lastMessageAt ? Date.parse(right.lastMessageAt) : 0) -
          (left.lastMessageAt ? Date.parse(left.lastMessageAt) : 0),
    ),
)
const separateReports = computed(() => props.standalone && workspace.chats.some((chat) => chat.report))
const filteredChats = computed(() =>
  separateReports.value
    ? [...matching.value].sort((left, right) => Number(Boolean(left.report)) - Number(Boolean(right.report)))
    : matching.value,
)
const visibleChats = computed(() => filteredChats.value.slice(0, visibleCount.value))
const groups = computed(() => {
  if (!separateReports.value) return [{ key: 'all', chats: visibleChats.value, title: undefined }]
  return [
    { key: 'new', chats: visibleChats.value.filter((chat) => !chat.report), title: t('newAnalysis.unanalysed') },
    { key: 'ready', chats: visibleChats.value.filter((chat) => chat.report), title: t('dashboard.reportsTitle') },
  ].filter((group) => group.chats.length)
})
const firstLoad = computed(
  () => !workspace.chats.length && (workspace.dialogsState === 'loading' || workspace.dialogsState === 'idle'),
)
const failed = computed(() => workspace.dialogsState === 'error' && !workspace.dialogs.length)

watch(query, () => {
  visibleCount.value = PAGE_SIZE
})
function clearSearch() {
  search.value = ''
  searchInput.value?.focus()
}
useIntersection(sentinel, () => {
  if (visibleCount.value < filteredChats.value.length) visibleCount.value += PAGE_SIZE
})
onMounted(() => {
  void workspace.loadDialogs()
})
</script>

<template>
  <div class="picker" :class="{ 'picker--sticky': standalone }">
    <div class="picker__tools">
      <UiInput
        ref="searchInput"
        v-model="search"
        type="search"
        name="chat-search"
        autocomplete="off"
        enterkeyhint="search"
        spellcheck="false"
        :icon="Search"
        :placeholder="t('newAnalysis.searchPlaceholder')"
        :aria-label="t('dashboard.search')"
        clearable
      />
    </div>

    <p v-if="!auth.telegramSessionActive" class="picker__note" role="status">
      {{ t('dashboard.sessionInactive') }}
      <button type="button" class="link" @click="relogin">{{ t('common.relogin') }}</button>
    </p>

    <!-- The list on its way: rows of the real height, so nothing jumps. -->
    <UiGroup v-if="firstLoad" aria-hidden="true">
      <div v-for="row in 7" :key="row" class="picker__skeleton">
        <UiSkeleton width="var(--avatar-md)" height="var(--avatar-md)" radius="var(--radius-pill)" />
        <span class="picker__skeleton-copy">
          <UiSkeleton class="picker__line picker__line--title" :width="`${64 - (row % 3) * 12}%`" />
          <UiSkeleton class="picker__line picker__line--sub" width="36%" />
        </span>
      </div>
    </UiGroup>

    <UiEmptyState
      v-else-if="failed"
      compact
      tone="danger"
      :icon="workspace.dialogsError?.code === 'TELEGRAM_BUSY' ? WifiOff : AlertCircle"
      :title="t('dashboard.dialogsError')"
      :description="errorMessage(workspace.dialogsError)"
    >
      <template #action>
        <UiButton @click="workspace.loadDialogs()">{{ t('common.retry') }}</UiButton>
      </template>
    </UiEmptyState>

    <template v-else>
      <template v-if="visibleChats.length">
        <UiGroup v-for="group in groups" :key="group.key" :header="group.title">
          <ChatRow v-for="chat in group.chats" :key="chat.id" :chat="chat" />
        </UiGroup>
      </template>
      <UiEmptyState
        v-else
        compact
        :icon="query ? Search : MessageSquare"
        :title="query ? t('dashboard.noMatchesTitle') : t('dashboard.emptyTitle')"
        :description="query ? t('dashboard.noMatchesText') : t('dashboard.emptyText')"
      >
        <template v-if="query" #action>
          <UiButton variant="secondary" @click="clearSearch">{{ t('dashboard.clearSearch') }}</UiButton>
        </template>
      </UiEmptyState>
      <p v-if="visibleChats.length < filteredChats.length" :key="visibleCount" ref="sentinel" class="picker__foot">
        {{ t('dashboard.shown', { shown: visibleChats.length, total: filteredChats.length }) }}
      </p>
      <p v-else-if="workspace.dialogsTruncated" class="picker__foot">{{ t('dashboard.truncated') }}</p>
      <p v-else-if="filteredChats.length > 8" class="picker__foot">
        {{ tc('dashboard.chatCount', filteredChats.length) }}
      </p>
    </template>
  </div>
</template>

<style scoped>
.picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-width: 0;
}

/* On its own page the search stays in reach while the list scrolls. */
.picker--sticky .picker__tools {
  position: sticky;
  top: var(--topbar-height);
  z-index: calc(var(--z-header) - 1);
  margin-inline: calc(var(--page-gutter) * -1);
  padding: var(--space-2) var(--page-gutter);
  background: var(--bg);
}

@media (min-width: 901px) {
  .picker--sticky .picker__tools {
    top: 0;
  }
}

.picker__note {
  color: var(--text-muted);
  font: var(--text-label);
}

.picker__skeleton {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--row-height);
  padding: var(--space-3) var(--row-inset);
}

.picker__skeleton-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
}

/* One line box of the real row's title (16/24) and subtitle (14/20). */
.picker__line {
  height: 1lh;
}

.picker__line--title {
  font: var(--text-body);
}

.picker__line--sub {
  font: var(--text-label);
}

.picker__foot {
  color: var(--text-muted);
  font: var(--text-label);
  text-align: center;
}
</style>

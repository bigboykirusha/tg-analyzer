<script setup lang="ts">
import { AlertCircle, MessageSquare, Search, WifiOff, X } from '../lib/icons'

/**
 * Every Telegram chat, to analyse one: a search well, «Все / Личные / Группы», then rows (ChatRow) —
 * the same list as a page on desktop (`/new`) and as a sheet on a phone (`?pick`).
 */
withDefaults(defineProps<{ sticky?: boolean }>(), { sticky: false })

const PAGE_SIZE = 30
const { t, tc } = useI18n()
const auth = useAuthStore()
const workspace = useWorkspaceStore()
const errorMessage = useErrorMessage()
const { relogin } = useAuth()

const search = ref('')
const filter = ref<'all' | 'private' | 'groups'>('all')
const visibleCount = ref(PAGE_SIZE)
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
const failed = computed(() => workspace.dialogsState === 'error' && !workspace.dialogs.length)

watch([search, filter], () => {
  visibleCount.value = PAGE_SIZE
})
useIntersection(sentinel, () => {
  if (visibleCount.value < filteredChats.value.length) visibleCount.value += PAGE_SIZE
})
onMounted(() => {
  void workspace.loadDialogs()
})
</script>

<template>
  <div class="picker" :class="{ 'picker--sticky': sticky }">
    <div class="picker__tools">
      <label class="picker__search">
        <Search class="icon-sm" aria-hidden="true" />
        <input
          v-model="search"
          type="search"
          name="chat-search"
          autocomplete="off"
          spellcheck="false"
          :placeholder="t('newAnalysis.searchPlaceholder')"
          :aria-label="t('dashboard.search')"
        />
        <button v-if="search" type="button" class="picker__clear" :aria-label="t('common.clear')" @click="search = ''">
          <X class="icon-sm" aria-hidden="true" />
        </button>
      </label>
      <UiFilters v-model="filter" :options="filterOptions" :label="t('dashboard.filter.label')" />
    </div>

    <p v-if="!auth.telegramSessionActive" class="picker__note" role="status">
      {{ t('dashboard.sessionInactive') }}
      <button type="button" class="link" @click="relogin">{{ t('common.relogin') }}</button>
    </p>
    <p v-else-if="workspace.dialogsStale" class="picker__note" role="status">
      {{ t('dashboard.staleDialogs') }}
      <button type="button" class="link" @click="workspace.loadDialogs()">{{ t('common.refresh') }}</button>
    </p>

    <!-- The list on its way: rows of the real height, so nothing jumps. -->
    <UiGroup v-if="firstLoad" aria-hidden="true">
      <div v-for="row in 7" :key="row" class="picker__skeleton">
        <UiSkeleton width="var(--avatar-md)" height="var(--avatar-md)" radius="var(--radius-full)" />
        <span class="picker__skeleton-copy">
          <UiSkeleton :width="`${64 - (row % 3) * 12}%`" height="var(--space-3)" />
          <UiSkeleton width="36%" height="var(--space-2)" />
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
      <UiGroup v-if="visibleChats.length">
        <ChatRow v-for="chat in visibleChats" :key="chat.id" :chat="chat" />
      </UiGroup>
      <UiEmptyState
        v-else
        compact
        :icon="search || filter !== 'all' ? Search : MessageSquare"
        :title="search || filter !== 'all' ? t('dashboard.noMatchesTitle') : t('dashboard.emptyTitle')"
        :description="search || filter !== 'all' ? t('dashboard.noMatchesText') : t('dashboard.emptyText')"
      >
        <template v-if="search" #action>
          <UiButton variant="secondary" @click="search = ''">{{ t('dashboard.clearSearch') }}</UiButton>
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

.picker__tools {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
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
    flex-direction: row;
    align-items: center;
  }

  .picker--sticky .picker__search {
    flex: 1;
  }
}

/* The search well: 36, grey, no ring — as in iOS. */
.picker__search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: var(--control-sm);
  padding: 0 var(--space-3);
  border-radius: var(--radius-well);
  background: var(--field-bg, var(--surface-2));
  color: var(--text-muted);
  font: var(--text-body);
}

.picker--sticky .picker__search {
  background: var(--surface);
}

.picker__search:focus-within {
  box-shadow: var(--ring-field-focus);
}

.picker__search input {
  flex: 1;
  min-width: 0;
  height: 100%;
  color: var(--text);
  outline: none;
}

.picker__search input::placeholder {
  color: var(--text-muted);
}

.picker__search input::-webkit-search-cancel-button {
  display: none;
}

.picker__clear {
  display: inline-grid;
  place-items: center;
  width: var(--control-sm);
  height: var(--control-sm);
  margin-right: calc(-1 * var(--space-3));
  color: var(--text-muted);
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
  padding-inline: var(--row-inset);
}

.picker__skeleton-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-2);
}

.picker__foot {
  color: var(--text-muted);
  font: var(--text-label);
  text-align: center;
}
</style>

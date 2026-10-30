<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'
import { LayoutGrid, Plus, Search, Settings } from '../lib/icons'

/**
 * The app's left column on wide screens: every analysed chat, personal chats
 * first, so switching between reports is one click.
 */
const workspace = useWorkspaceStore()
const route = useRoute()
const { t, formatPercent } = useI18n()

const query = ref('')
const matches = (report: ReportSummaryDto) =>
  !query.value.trim() || report.title.toLocaleLowerCase().includes(query.value.trim().toLocaleLowerCase())
const personal = computed(() => workspace.reports.filter((report) => report.type !== 'group' && matches(report)))
const groups = computed(() => workspace.reports.filter((report) => report.type === 'group' && matches(report)))
const sections = computed(() =>
  [
    { key: 'personal', title: t('sidebar.personal'), items: personal.value },
    { key: 'groups', title: t('sidebar.groups'), items: groups.value },
  ].filter((section) => section.items.length),
)
const activeId = computed(() => (route.path.startsWith('/chat/') ? String(route.params.id) : null))
const share = (report: ReportSummaryDto) =>
  report.type === 'group' || report.headline?.sentSharePct == null ? null : formatPercent(report.headline.sentSharePct)
</script>

<template>
  <aside class="sidebar" :aria-label="t('sidebar.label')">
    <div class="sidebar__brand"><BrandLink to="/dashboard" /></div>

    <label v-if="workspace.reports.length > 6" class="sidebar__search">
      <Search aria-hidden="true" />
      <input v-model="query" type="search" :placeholder="t('sidebar.search')" :aria-label="t('sidebar.search')" />
    </label>

    <nav class="sidebar__list" :aria-label="t('sidebar.reports')">
      <NuxtLink to="/dashboard" class="sidebar__item" :aria-current="route.path === '/dashboard' ? 'page' : undefined">
        <span class="sidebar__icon sidebar__icon--plain"><LayoutGrid aria-hidden="true" /></span>
        <span class="sidebar__name">{{ t('nav.home') }}</span>
      </NuxtLink>
      <NuxtLink
        to="/new"
        class="sidebar__item sidebar__item--action"
        :aria-current="route.path === '/new' ? 'page' : undefined"
      >
        <span class="sidebar__icon"><Plus aria-hidden="true" /></span>
        <span class="sidebar__name">{{ t('sidebar.newAnalysis') }}</span>
      </NuxtLink>

      <template v-for="section in sections" :key="section.key">
        <p class="sidebar__heading">{{ section.title }}</p>
        <NuxtLink
          v-for="report in section.items"
          :key="report.chatId"
          :to="`/chat/${report.chatId}`"
          class="sidebar__item"
          :aria-current="activeId === report.chatId ? 'page' : undefined"
        >
          <ChatAvatar :chat-id="report.chatId" :title="report.title" size="xs" />
          <span class="sidebar__name">{{ report.title }}</span>
          <small v-if="share(report)" class="sidebar__meta">{{ share(report) }}</small>
        </NuxtLink>
      </template>
      <!-- The report list on its way: rows of the same height, so the list does not jump in. -->
      <div
        v-if="!workspace.reports.length && workspace.reportsState !== 'ready' && workspace.reportsState !== 'error'"
        aria-hidden="true"
      >
        <div class="sidebar__heading"><UiSkeleton width="64px" height="10px" /></div>
        <div v-for="row in 4" :key="row" class="sidebar__item">
          <UiSkeleton width="24px" height="24px" radius="50%" />
          <UiSkeleton :width="`${80 - row * 9}%`" />
        </div>
      </div>
      <p v-else-if="!workspace.reports.length && workspace.reportsState === 'ready'" class="sidebar__empty">
        {{ t('sidebar.empty') }}
      </p>
    </nav>

    <NuxtLink
      to="/account"
      class="sidebar__item sidebar__foot"
      :aria-current="route.path === '/account' ? 'page' : undefined"
    >
      <span class="sidebar__icon"><Settings aria-hidden="true" /></span>
      <span class="sidebar__name">{{ t('account.settings') }}</span>
    </NuxtLink>
  </aside>
</template>

<style scoped>
.sidebar {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  height: 100dvh;
  padding: 0 var(--space-3) var(--space-4);
  overflow-y: auto;
  scrollbar-width: thin;
}

.sidebar__brand {
  display: flex;
  flex: none;
  align-items: center;
  height: var(--topbar-height);
  padding: 0 var(--space-2);
}

.sidebar__search {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  height: 34px;
  margin-bottom: var(--space-2);
  padding: 0 10px;
  border-radius: var(--radius-md);
  background: var(--surface-2);
  color: var(--text-muted);
}

.sidebar__search input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: none;
  color: var(--text);
  font: var(--text-small);
  outline: none;
}

.sidebar__search input::placeholder {
  color: var(--text-muted);
}

.sidebar__list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.sidebar__heading {
  padding: 14px var(--space-2) var(--space-1);
  color: var(--text-muted);
  font: var(--text-caption);
}

.sidebar__item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 7px var(--space-2);
  border-radius: var(--radius-md);
  font: var(--text-ui);
  transition: background-color var(--transition-fast);
}

.sidebar__item[aria-current='page'] {
  background: var(--surface-2);
}

@media (hover: hover) {
  .sidebar__item:not([aria-current='page']):hover {
    background: var(--hover);
  }
}

.sidebar__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  background: var(--surface-2);
  color: var(--text);
}

.sidebar__icon--plain {
  background: transparent;
  color: var(--text-muted);
}

.sidebar__item--action .sidebar__icon {
  background: var(--accent);
  color: var(--on-accent);
}

.sidebar__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar__meta {
  margin-left: auto;
  color: var(--text-muted);
  font: var(--text-caption);
  font-variant-numeric: tabular-nums;
}

.sidebar__empty {
  padding: var(--space-2);
  color: var(--text-muted);
  font: var(--text-small);
}

.sidebar__foot {
  margin-top: var(--space-2);
  color: var(--text-muted);
}
</style>

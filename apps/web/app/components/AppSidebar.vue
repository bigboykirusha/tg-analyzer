<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'
import { House, Plus } from '../lib/icons'

/**
 * The desktop sidebar (280): the logo, the one primary action, «Главная», every report (avatar, name, one
 * quiet line) in the order home shows them, and at the foot the running analysis and your account. The logo
 * leads home too, but it is a logo: the place you are is marked on «Главная», never on the brand.
 */
const workspace = useWorkspaceStore()
const auth = useAuthStore()
const route = useRoute()
const { t, tc, formatNumber } = useI18n()
const analysis = useAnalysis()

const activeId = computed(() => (route.path.startsWith('/chat/') ? String(route.params.id) : null))
const displayName = computed(() => auth.user?.firstName || auth.user?.username || t('account.anonymous'))
const loading = computed(
  () => !workspace.reports.length && workspace.reportsState !== 'ready' && workspace.reportsState !== 'error',
)

function meta(report: ReportSummaryDto) {
  const count = tc('common.messagesCount', report.totalMessages, { count: formatNumber(report.totalMessages) })
  return report.type === 'group' ? t('sidebar.groupMeta', { count }) : count
}
function updating(report: ReportSummaryDto) {
  return (
    (analysis.isActive.value && analysis.progress.value.chatId === report.chatId) ||
    analysis.queued.value.some((item) => item.chatId === report.chatId)
  )
}
</script>

<template>
  <aside class="sidebar" :aria-label="t('sidebar.label')">
    <BrandLink class="sidebar__brand" to="/dashboard" />
    <UiButton to="/new" variant="primary" block :icon="Plus" :aria-current="route.path === '/new' ? 'page' : undefined">
      {{ t('sidebar.newAnalysis') }}
    </UiButton>
    <NuxtLink
      to="/dashboard"
      class="sidebar__row sidebar__nav"
      :aria-current="route.path === '/dashboard' ? 'page' : undefined"
    >
      <House class="sidebar__icon" aria-hidden="true" />
      {{ t('nav.home') }}
    </NuxtLink>

    <nav class="sidebar__list" :aria-label="t('sidebar.reports')">
      <p class="sidebar__heading">{{ t('sidebar.reports') }}</p>
      <NuxtLink
        v-for="chat in workspace.reportChats"
        :key="chat.id"
        :to="`/chat/${chat.id}`"
        class="sidebar__row sidebar__person"
        :aria-current="activeId === chat.id ? 'page' : undefined"
      >
        <ChatAvatar :chat-id="chat.id" :title="chat.title" :has-avatar="chat.hasAvatar" size="sm" />
        <span class="sidebar__copy">
          <span class="sidebar__name">{{ chat.title }}</span>
          <span class="sidebar__meta">{{ meta(chat.report!) }}</span>
        </span>
        <span v-if="updating(chat.report!)" class="spinner" role="img" :aria-label="t('sidebar.updating')" />
      </NuxtLink>
      <!-- The list on its way: rows of the same height, so nothing jumps when it arrives. -->
      <template v-if="loading">
        <div v-for="row in 4" :key="row" class="sidebar__row sidebar__person" aria-hidden="true">
          <UiSkeleton width="var(--avatar-sm)" height="var(--avatar-sm)" radius="var(--radius-full)" />
          <span class="sidebar__copy">
            <UiSkeleton :width="`${76 - row * 8}%`" height="var(--space-3)" />
            <UiSkeleton width="40%" height="var(--space-2)" />
          </span>
        </div>
      </template>
      <p v-else-if="!workspace.reports.length" class="sidebar__empty">{{ t('sidebar.empty') }}</p>
    </nav>

    <div class="sidebar__foot">
      <AnalysisLive variant="card" />
      <NuxtLink
        to="/account"
        class="sidebar__row sidebar__person"
        :aria-current="route.path === '/account' ? 'page' : undefined"
      >
        <ProfileAvatar :title="displayName" size="sm" />
        <span class="sidebar__copy">
          <span class="sidebar__name">{{ displayName }}</span>
          <span class="sidebar__meta">{{ t('account.settings') }}</span>
        </span>
      </NuxtLink>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  height: 100dvh;
  padding: var(--space-4) var(--space-3);
  overflow-y: auto;
  background: var(--sidebar-glass);
  box-shadow: var(--divider-right);
  scrollbar-width: thin;
}

.sidebar__row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--control-sm);
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-xs);
  color: var(--text);
  font: var(--text-ui);
  transition: background-color var(--transition-fast);
}

.sidebar__row[aria-current='page'] {
  background: var(--sidebar-selection);
}

@media (hover: hover) and (pointer: fine) {
  .sidebar__row:not([aria-current='page']):hover {
    background: var(--hover);
  }
}

/* The logo sits on the row grid: its mark lines up with the avatars below. */
.sidebar__brand {
  align-self: flex-start;
  min-height: var(--space-12);
  margin-bottom: var(--space-1);
  padding-inline: var(--space-2);
}

/* «Главная»: a row like a report, its icon in the avatar's place. */
.sidebar__nav {
  min-height: var(--control-md);
  margin-top: var(--space-2);
}

.sidebar__icon {
  width: var(--avatar-sm);
  --icon-size: var(--icon-md);
}

.sidebar__list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-0-5);
  margin-top: var(--space-4);
}

.sidebar__heading {
  padding: 0 var(--space-2) var(--space-1);
  color: var(--text-muted);
  font: var(--text-caption);
}

.sidebar__person {
  min-height: var(--space-12);
}

.sidebar__copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-0-5);
  min-width: 0;
}

.sidebar__name,
.sidebar__meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar__meta {
  color: var(--text-muted);
  font: var(--text-small);
}

.sidebar__empty {
  padding: var(--space-1) var(--space-2);
  color: var(--text-muted);
  font: var(--text-small);
}

.sidebar__foot {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>

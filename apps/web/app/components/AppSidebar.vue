<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'
import { Bell, House, Plus } from '../lib/icons'

/**
 * The desktop sidebar (280): the logo, the one primary action, «Главная», every report (avatar, name, one
 * quiet line) in the order home shows them, and at the foot the running analysis and your account. The logo
 * leads home too, but it is a logo: the place you are is marked on «Главная», never on the brand.
 */
const workspace = useWorkspaceStore()
/** As many skeleton rows as there were reports last time (two when unknown), so the list does not jump. */
const skeletonRows = computed(() => Math.min(8, workspace.reportsHint || 2))
const auth = useAuthStore()
const route = useRoute()
const { t, tc, formatNumber } = useI18n()
const analysis = useAnalysis()

const activeId = computed(() => (route.path.startsWith('/chat/') ? String(route.params.id) : null))
const notifications = useNotificationsStore()
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
    <div class="sidebar__navs">
      <NuxtLink
        to="/dashboard"
        class="sidebar__row sidebar__nav"
        :aria-current="route.path === '/dashboard' ? 'page' : undefined"
      >
        <House class="sidebar__icon" aria-hidden="true" />
        {{ t('nav.home') }}
      </NuxtLink>
      <NuxtLink
        to="/notifications"
        class="sidebar__row sidebar__nav"
        :aria-current="route.path === '/notifications' ? 'page' : undefined"
      >
        <Bell class="sidebar__icon" aria-hidden="true" />
        <span class="sidebar__nav-label">{{ t('nav.notifications') }}</span>
        <span v-if="notifications.unread" class="sidebar__count t-caption">
          <span class="sr-only">{{ t('notifications.unreadLabel', { count: notifications.unread }) }}</span>
          <span aria-hidden="true">{{ notifications.unread }}</span>
        </span>
      </NuxtLink>
    </div>

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
        <div v-for="row in skeletonRows" :key="row" class="sidebar__row sidebar__person" aria-hidden="true">
          <UiSkeleton width="var(--avatar-sm)" height="var(--avatar-sm)" radius="var(--radius-pill)" />
          <span class="sidebar__copy">
            <UiSkeleton class="sidebar__line sidebar__line--name" :width="`${76 - row * 8}%`" />
            <UiSkeleton class="sidebar__line sidebar__line--meta" width="40%" />
          </span>
        </div>
      </template>
      <!-- A failed list is not an empty one: say it failed (home shows «Повторить»), never «здесь появятся…». -->
      <p v-else-if="!workspace.reports.length && workspace.reportsState === 'error'" class="sidebar__empty">
        {{ t('dashboard.reportsError') }}
      </p>
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
  border-radius: var(--radius-well);
  color: var(--text);
  font: var(--text-label);
  transition: background-color var(--transition-fast);
}

/* The open screen: a raised white row with a hairline edge — the same object as a card on the page. */
.sidebar__row[aria-current='page'] {
  background: var(--sidebar-selection);
  box-shadow: var(--ring-card);
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

/*
 * «Главная» and «Уведомления»: one tight group, like the report rows below (36 tall, 2 apart), the icon in the
 * avatar's place.
 */
.sidebar__navs {
  display: flex;
  flex-direction: column;
  gap: var(--space-0-5);
  margin-top: var(--space-2);
}

.sidebar__nav-label {
  flex: 1;
}

/* Unread news: a small ink capsule at the row's end, as in Mail's sidebar. */
.sidebar__count {
  min-width: var(--space-6);
  padding: 0 var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--text);
  color: var(--bg);
  text-align: center;
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

/* The skeleton's lines are one line box of the name and of the meta. */
.sidebar__line {
  height: 1lh;
  font: var(--text-label);
}

.sidebar__meta {
  color: var(--text-muted);
  font: var(--text-label);
}

.sidebar__empty {
  padding: var(--space-1) var(--space-2);
  color: var(--text-muted);
  font: var(--text-label);
}

.sidebar__foot {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
</style>

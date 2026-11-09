<script setup lang="ts">
import type { ReportSummaryDto } from '@tg-analyzer/shared'
import { Plus } from '../lib/icons'

/**
 * The desktop sidebar (280): the mark row is «Главная»; then the one primary action, every report
 * (avatar, name, one quiet line), and at the foot the running analysis and your account.
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
    <NuxtLink
      to="/dashboard"
      class="sidebar__row sidebar__home"
      :aria-current="route.path === '/dashboard' ? 'page' : undefined"
    >
      <BrandMark :size="28" />
      <span class="sidebar__wordmark">TG Analyzer</span>
      <span class="sr-only">{{ t('nav.home') }}</span>
    </NuxtLink>
    <UiButton to="/new" variant="primary" block :icon="Plus" :aria-current="route.path === '/new' ? 'page' : undefined">
      {{ t('sidebar.newAnalysis') }}
    </UiButton>

    <nav class="sidebar__list" :aria-label="t('sidebar.reports')">
      <p class="sidebar__heading">{{ t('sidebar.reports') }}</p>
      <NuxtLink
        v-for="report in workspace.reports"
        :key="report.chatId"
        :to="`/chat/${report.chatId}`"
        class="sidebar__row sidebar__person"
        :aria-current="activeId === report.chatId ? 'page' : undefined"
      >
        <ChatAvatar :chat-id="report.chatId" :title="report.title" size="sm" />
        <span class="sidebar__copy">
          <span class="sidebar__name">{{ report.title }}</span>
          <span class="sidebar__meta">{{ meta(report) }}</span>
        </span>
        <span v-if="updating(report)" class="spinner" role="img" :aria-label="t('sidebar.updating')" />
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

/* The mark row is home: 48 tall, the wordmark beside the mark. */
.sidebar__home {
  min-height: var(--space-12);
  padding-left: var(--space-1);
}

.sidebar__wordmark {
  font: var(--text-title);
  font-weight: 600;
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

<script setup lang="ts">
import { MIN_REPORT_MESSAGES, type NotificationDto } from '@tg-analyzer/shared'
import type { Component } from 'vue'
import { AlertCircle, AlertTriangle, Bell, Check, Eye, Hourglass, Sparkles } from '../lib/icons'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

const { t, tc, formatDate, formatNumber } = useI18n()
useSeoMeta({ title: () => t('notifications.title') })
const store = useNotificationsStore()
const workspace = useWorkspaceStore()

onMounted(() => void store.open())

function headline(item: NotificationDto) {
  switch (item.kind) {
    case 'report_ready':
      return t('notifications.reportReady')
    case 'analysis_failed':
      return t('notifications.analysisFailed')
    case 'quiz_answered':
      return t('notifications.quizScore')
    case 'link_opened':
      return t('notifications.linkOpened')
    case 'link_expiring':
      return t(item.link === 'quiz' ? 'notifications.quizExpiring' : 'notifications.linkExpiring')
  }
}

/** The event and its detail: «Отчёт готов · 1 200 сообщений», «Разбор не получился. В этом чате меньше…». */
function detail(item: NotificationDto) {
  const more = (() => {
    switch (item.kind) {
      case 'report_ready':
        return tc('common.messagesCount', item.messages, { count: formatNumber(item.messages) })
      case 'analysis_failed':
        // The real reason, not «try again»: a chat too small for a report will not get bigger by trying.
        return t(`analysis.error.${item.error}`, { min: MIN_REPORT_MESSAGES })
      case 'quiz_answered':
        return item.score === null
          ? t('notifications.detail.hidden')
          : t('notifications.detail.score', { score: item.score, total: item.total })
      case 'link_opened':
        return ''
      case 'link_expiring':
        return t('notifications.detail.until', { date: formatDate(item.expiresAt, { day: 'numeric', month: 'long' }) })
    }
  })()
  // The person leads the row, as in any notification list (18.11); the event and its number are the line under it.
  if (!more) return headline(item)
  // A reason is a sentence of its own, as written («Telegram был занят…» keeps its capital).
  if (item.kind === 'analysis_failed') return `${headline(item)}. ${more}`
  return `${headline(item)} · ${more}`
}

/** The kind of news, as the badge on the avatar. */
const KIND_ICON: Record<NotificationDto['kind'], Component> = {
  report_ready: Check,
  analysis_failed: AlertTriangle,
  quiz_answered: Sparkles,
  link_opened: Eye,
  link_expiring: Hourglass,
}

/** Where a row leads: the report, or its «Поделиться» when the news is about a link or the quiz. */
function target(item: NotificationDto) {
  const share = item.kind === 'quiz_answered' || item.kind === 'link_expiring' || item.kind === 'link_opened'
  return share ? { path: `/chat/${item.chatId}`, query: { share: null } } : `/chat/${item.chatId}`
}

const dayKey = (value: string) => new Date(value).toDateString()
function dayTitle(value: string) {
  const day = new Date(value)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (day.toDateString() === today.toDateString()) return t('notifications.today')
  if (day.toDateString() === yesterday.toDateString()) return t('notifications.yesterday')
  return formatDate(value, { day: 'numeric', month: 'long' })
}

const groups = computed(() => {
  const days: { key: string; title: string; items: NotificationDto[] }[] = []
  for (const item of store.items) {
    const key = dayKey(item.createdAt)
    const last = days.at(-1)
    if (last?.key === key) last.items.push(item)
    else days.push({ key, title: dayTitle(item.createdAt), items: [item] })
  }
  return days
})

const hasAvatar = (chatId: string) => workspace.chats.find((chat) => chat.id === chatId)?.hasAvatar
const time = (value: string) => formatDate(value, { hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <UiPageContainer size="narrow">
    <div class="page">
      <UiPageBar :title="t('notifications.title')" back="/dashboard" />

      <PushRow hide-on />

      <div v-if="store.state === 'loading'" class="feed" aria-busy="true">
        <UiGroup>
          <UiListRow v-for="row in 3" :key="row" aria-hidden="true">
            <template #leading>
              <UiSkeleton width="var(--avatar-md)" height="var(--avatar-md)" radius="var(--radius-pill)" />
            </template>
            <UiSkeleton width="60%" height="var(--space-4)" />
            <template #subtitle><UiSkeleton width="40%" height="var(--space-3)" /></template>
          </UiListRow>
        </UiGroup>
      </div>

      <UiEmptyState
        v-else-if="store.state === 'error'"
        tone="danger"
        compact
        :icon="AlertCircle"
        :title="t('notifications.error')"
      >
        <template #action>
          <UiButton @click="store.open()">{{ t('common.retry') }}</UiButton>
        </template>
      </UiEmptyState>

      <UiEmptyState
        v-else-if="!store.items.length"
        :icon="Bell"
        :title="t('notifications.emptyTitle')"
        :description="t('notifications.emptyText')"
      />

      <div v-else class="feed">
        <UiGroup v-for="day in groups" :key="day.key" :header="day.title">
          <ul class="feed__list">
            <li v-for="item in day.items" :key="item.id">
              <UiListRow :title="item.title" :subtitle="detail(item)" :to="target(item)">
                <!-- The time stands in the name's line, as in iOS notifications: the line under it keeps the full width. -->
                <span class="note__head">
                  <span class="note__name">{{ item.title }}</span>
                  <time class="note__time" :datetime="item.createdAt">{{ time(item.createdAt) }}</time>
                </span>
                <template #leading>
                  <span class="note__avatar">
                    <ChatAvatar :chat-id="item.chatId" :title="item.title" :has-avatar="hasAvatar(item.chatId)" />
                    <span class="note__kind" aria-hidden="true"><component :is="KIND_ICON[item.kind]" /></span>
                  </span>
                </template>
              </UiListRow>
            </li>
          </ul>
        </UiGroup>
      </div>
    </div>
  </UiPageContainer>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--page-gap);
}

.feed {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

/*
 * A feed, not a settings card (18.11): the days are headings and the rows stand on the page itself, as an activity
 * list in Telegram or Instagram — the person and the time on top, what happened under it in up to two lines.
 */
.feed {
  --group-bg: transparent;
  --group-ring: none;
  --group-inset: 0px;
}

.feed__list > li {
  --row-fill-radius: var(--radius-well);
}

.feed__list > li:not(:last-child) :deep(.list-row__body) {
  box-shadow: var(--divider-bottom);
}

.feed__list :deep(.list-row__subtitle) {
  display: -webkit-box;
  white-space: normal;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
}

.note__avatar {
  position: relative;
  flex: none;
  display: inline-flex;
}

/* The kind of news: a small ink badge on the avatar's shoulder, ringed by the card. */
.note__kind {
  position: absolute;
  right: calc(-1 * var(--space-1));
  bottom: calc(-1 * var(--space-1));
  display: inline-grid;
  place-items: center;
  /* The circle as before (20 with its ring); only the glyph in it is small (18.11): a mark, not a second picture. */
  width: var(--icon-md);
  height: var(--icon-md);
  border: var(--space-0-5) solid var(--surface);
  border-radius: var(--radius-pill);
  background: var(--text);
  color: var(--bg);
  --icon-size: var(--icon-xs);
}

.note__head {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  min-width: 0;
}

.note__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.note__time {
  flex: none;
  color: var(--text-muted);
  font: var(--text-label);
  white-space: nowrap;
}
</style>

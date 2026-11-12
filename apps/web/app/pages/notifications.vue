<script setup lang="ts">
import type { NotificationDto } from '@tg-analyzer/shared'
import type { Component } from 'vue'
import { AlertCircle, AlertTriangle, Bell, Check, Eye, Hourglass, Sparkles } from '../lib/icons'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

/**
 * «Уведомления»: what happened to your reports while you were away — a report ready, an analysis that failed,
 * a quiz answered, your report link opened by someone, a link about to end. They look like the notifications
 * people already know, iPhone's: one card each, the chat's avatar with the kind of news as a small badge on it,
 * what happened in bold with the time at its end, then the chat and the detail. Grouped by day; a card opens where
 * to act. Opening the page reads them all (the bell's dot is the «new»). The bot repeats the important ones.
 */
const { t, tc, formatDate, formatNumber } = useI18n()
useSeoMeta({ title: () => t('notifications.title') })
const store = useNotificationsStore()
const workspace = useWorkspaceStore()
const auth = useAuthStore()
/** «Настроить» leads to the bot switch in the account, which exists only when the bot is set up. */
const botAvailable = computed(() => Boolean(auth.user?.botUrl || auth.user?.botNotify))

onMounted(() => void store.open())

/** What happened: the card's bold line. */
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

/** The chat and the detail: «Мама · 5 из 5». */
function detail(item: NotificationDto) {
  const more = (() => {
    switch (item.kind) {
      case 'report_ready':
        return tc('common.messagesCount', item.messages, { count: formatNumber(item.messages) })
      case 'analysis_failed':
        return t('notifications.detail.failed')
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
  return more ? `${item.title} · ${more}` : item.title
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
  const yesterday = new Date(today.getTime() - 86_400_000)
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

      <div v-if="store.state === 'loading'" class="feed" aria-busy="true">
        <div class="feed__list">
          <div v-for="row in 3" :key="row" class="note note--skeleton">
            <UiSkeleton width="var(--avatar-md)" height="var(--avatar-md)" radius="var(--radius-full)" />
            <div class="note__copy">
              <UiSkeleton width="60%" height="var(--space-4)" />
              <UiSkeleton width="40%" height="var(--space-3)" />
            </div>
          </div>
        </div>
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
        <section v-for="day in groups" :key="day.key" class="feed__day" :aria-label="day.title">
          <h2 class="feed__label t-label">{{ day.title }}</h2>
          <ul class="feed__list">
            <li v-for="item in day.items" :key="item.id">
              <NuxtLink class="note" :to="target(item)">
                <span class="note__avatar">
                  <ChatAvatar :chat-id="item.chatId" :title="item.title" :has-avatar="hasAvatar(item.chatId)" />
                  <span class="note__kind" aria-hidden="true"><component :is="KIND_ICON[item.kind]" /></span>
                </span>
                <span class="note__copy">
                  <span class="note__head">
                    <span class="note__title">{{ headline(item) }}</span>
                    <time class="note__time" :datetime="item.createdAt">{{ time(item.createdAt) }}</time>
                  </span>
                  <span class="note__detail">{{ detail(item) }}</span>
                </span>
              </NuxtLink>
            </li>
          </ul>
        </section>
        <p v-if="botAvailable" class="feed__foot t-label">
          {{ t('notifications.foot') }}
          <NuxtLink class="link" to="/account">{{ t('notifications.footLink') }}</NuxtLink>
        </p>
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

/* A feed on the page itself: days a step apart, each a quiet label over its lines. */
.feed {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.feed__day {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.feed__label {
  color: var(--text-muted);
}

.feed__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/*
 * One notification, as on an iPhone's lock screen: its own card, the avatar with the kind of news on it, what
 * happened in bold with the time at its end, then the chat and the detail.
 */
.note {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-card);
  background: var(--surface);
  color: var(--text);
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color var(--transition-fast),
    transform var(--duration-press) var(--ease-standard);
}

@media (hover: hover) and (pointer: fine) {
  a.note:hover {
    background-image: linear-gradient(var(--hover), var(--hover));
  }
}

a.note:active {
  transform: scale(var(--press-scale-lg));
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
  width: var(--icon-md);
  height: var(--icon-md);
  border: var(--space-0-5) solid var(--surface);
  border-radius: var(--radius-pill);
  background: var(--text);
  color: var(--bg);
  --icon-size: var(--space-3);
}

.note__copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-0-5);
  min-width: 0;
}

.note__head {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.note__title {
  flex: 1;
  min-width: 0;
  color: var(--text);
  font: var(--text-body);
}

.note__time,
.note__detail {
  color: var(--text-muted);
  font: var(--text-label);
}

.note__time {
  flex: none;
}

.feed__foot {
  color: var(--text-muted);
}
</style>

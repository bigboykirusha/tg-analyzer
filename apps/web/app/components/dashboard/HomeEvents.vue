<script setup lang="ts">
import type { HomeEvent } from '@tg-analyzer/shared'
import { RotateCw } from '../../lib/icons'
import { hueOf } from '../../lib/hue'

/**
 * «Сейчас главное»: one anatomy for every tile — a label (whose it is), the answer, what it rests on, the
 * action at the bottom. The first news about a person is their poster; the rest are white. Phones show the
 * lead only; desktop up to three side by side.
 */
type ChatEvent = Exclude<HomeEvent, { kind: 'month' | 'unanalysed' }>
const props = defineProps<{ events: HomeEvent[] }>()
const { t, tc, formatNumber, formatDate } = useI18n()
const actions = useReportActions()

const tiles = computed(() => {
  const chats = props.events.filter((event): event is ChatEvent => 'chatId' in event && event.kind !== 'unanalysed')
  const month = props.events.find((event) => event.kind === 'month')
  return [...chats, ...(month ? [month] : [])].slice(0, 3)
})
const day = (iso: string) => formatDate(iso, { day: 'numeric', month: 'long' })
const share = (messages: number, total: number) => `${Math.max(2, Math.round((messages / Math.max(1, total)) * 100))}%`
</script>

<template>
  <div class="events">
    <template v-for="(event, index) in tiles" :key="event.kind">
      <!-- New messages since the report: the person's poster, refresh right here. -->
      <article v-if="event.kind === 'new'" class="event event--poster" :data-hue="hueOf(event.chatId)">
        <NuxtLink :to="`/chat/${event.chatId}`" class="event__label">
          <ChatAvatar :chat-id="event.chatId" :title="event.title" size="xs" on-poster />{{ event.title }}
        </NuxtLink>
        <h3 class="event__answer">
          {{ tc('home.newTitle', event.added, { count: formatNumber(event.added), date: day(event.analyzedAt) }) }}
        </h3>
        <p class="event__note">{{ t('home.newLine', { date: day(event.analyzedAt) }) }}</p>
        <div class="event__actions">
          <UiButton
            variant="poster-soft"
            :icon="RotateCw"
            :loading="actions.busy(event.chatId)"
            @click="actions.analyse(event.chatId, event.title)"
          >
            {{ t('dashboard.refreshReport') }}
          </UiButton>
          <UiButton variant="plain" :to="`/chat/${event.chatId}`">{{ t('home.open') }}</UiButton>
        </div>
      </article>

      <!-- Any other first news about a person is their poster too; later tiles are white. -->
      <article
        v-else-if="event.kind === 'quiz' || event.kind === 'milestone'"
        class="event"
        :class="{ 'event--poster': index === 0 }"
        :data-hue="hueOf(event.chatId)"
      >
        <NuxtLink :to="`/chat/${event.chatId}`" class="event__label">
          <ChatAvatar :chat-id="event.chatId" :title="event.title" size="xs" :on-poster="index === 0" />
          {{ event.kind === 'quiz' ? t('home.quizLabel', { name: event.title }) : event.title }}
        </NuxtLink>
        <template v-if="event.kind === 'quiz'">
          <h3 class="event__answer">{{ t('home.quizTitle', { score: event.score, total: event.total }) }}</h3>
          <span class="event__dots" role="img" :aria-label="t('home.quizTitle', { score: event.score, total: event.total })">
            <i v-for="dot in event.total" :key="dot" :class="{ 'is-on': dot <= event.score }" />
          </span>
        </template>
        <h3 v-else class="event__answer">
          {{ tc('home.milestoneTitle', event.days, { n: formatNumber(event.index), count: event.days }) }}
        </h3>
        <div class="event__actions">
          <UiButton :variant="index === 0 ? 'poster-soft' : 'secondary'" :to="`/chat/${event.chatId}`">
            {{ t('home.openReport') }}
          </UiButton>
        </div>
      </article>

      <!-- The last 30 days: who you wrote to most, one bar in their colours, three rows. -->
      <article v-else-if="event.kind === 'month'" class="event">
        <p class="event__label event__label--quiet">{{ t('home.monthLabel') }}</p>
        <h3 class="event__answer">
          {{
            t('home.monthTitle', {
              messages: tc('home.monthMessages', event.messages, { count: formatNumber(event.messages) }),
              chats: tc('home.monthChats', event.chats, { count: event.chats }),
            })
          }}
        </h3>
        <div class="event__bar" aria-hidden="true">
          <i
            v-for="chat in event.top.slice(0, 3)"
            :key="chat.chatId"
            :data-hue="hueOf(chat.chatId)"
            :style="{ flexBasis: share(chat.messages, event.messages) }"
          />
          <i class="event__bar-rest" />
        </div>
        <ul class="event__rows">
          <li v-for="chat in event.top.slice(0, 3)" :key="chat.chatId">
            <ChatAvatar :chat-id="chat.chatId" :title="chat.title" size="xs" />
            <span class="event__row-name">{{ chat.title }}</span>
            <span class="event__row-value">{{ formatNumber(chat.messages) }}</span>
          </li>
        </ul>
      </article>
    </template>
  </div>
</template>

<style scoped>
.events {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--card-gap);
}

/* Phones: the lead news only. */
@media (max-width: 640px) {
  .event:not(:first-child) {
    display: none;
  }
}

@media (min-width: 641px) {
  .events {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Desktop: as many columns as there are tiles, up to three — two tiles share the row, no empty third. */
@media (min-width: 1100px) {
  .events {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
}

.event {
  --btn-secondary-bg: transparent;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--card-padding);
  border-radius: var(--radius-lg);
  background: var(--surface);
}

.event--poster {
  background: var(--poster);
  color: var(--on-poster);
}

.event__label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--avatar-xs);
  color: var(--text-muted);
  font: var(--text-small);
}

.event--poster .event__label,
.event--poster .event__note {
  color: var(--on-poster-muted);
}

.event__answer {
  font: var(--text-h3);
  letter-spacing: var(--tracking-h3);
  text-wrap: balance;
}

.event__note {
  color: var(--text-muted);
  font: var(--text-small);
}

.event__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: auto;
  padding-top: var(--space-1);
}

.event__dots {
  display: flex;
  gap: var(--space-2);
}

.event__dots i {
  width: var(--avatar-xs);
  height: var(--avatar-xs);
  border-radius: var(--radius-full);
  background: var(--surface-2);
}

.event__dots i.is-on {
  background: var(--you);
}

.event__bar {
  display: flex;
  gap: var(--space-0-5);
  height: var(--bar-height);
  overflow: hidden;
  border-radius: var(--radius-full);
}

.event__bar i {
  flex-shrink: 0;
  background: var(--them);
}

.event__bar .event__bar-rest {
  flex: 1;
  background: var(--chart-neutral);
}

.event__rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.event__rows li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font: var(--text-small);
}

.event__row-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event__row-value {
  font-weight: 500;
}
</style>

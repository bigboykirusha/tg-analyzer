<script setup lang="ts">
import type { RecentActivityResponse } from '@tg-analyzer/shared'

/**
 * The top of the home page: private chats of the last month, counted by
 * Telegram without an analysis. An ink tile with the busiest people and who
 * writes more, and a lime tile with the person the user wrote with most.
 */
const props = defineProps<{ recent: RecentActivityResponse; reportIds: Set<string> }>()
const { t, tc, formatNumber, formatPercent } = useI18n()

const ROWS = 5

const total = computed(() => props.recent.chats.reduce((sum, chat) => sum + chat.messages, 0))
const mine = computed(() => props.recent.chats.reduce((sum, chat) => sum + chat.mine, 0))
// With one chat the lime tile would only repeat the single row.
const top = computed(() => (props.recent.chats.length > 1 ? props.recent.chats[0]! : null))
const rows = computed(() =>
  props.recent.chats.slice(0, ROWS).map((chat) => ({ ...chat, share: (chat.mine / chat.messages) * 100 })),
)
const share = (value: number, of: number) => (of ? (value / of) * 100 : 0)
</script>

<template>
  <div class="bento month">
    <section class="tile tile--ink month__main" :class="top ? 'span-8' : 'span-12'">
      <div class="tile__label">{{ t('month.label') }}</div>
      <template v-if="recent.chats.length">
        <div class="tile__figure">{{ formatNumber(total) }}</div>
        <div class="tile__note">
          {{ tc('month.inChats', recent.chats.length) }} ·
          {{ t('month.mine', { share: formatPercent(share(mine, total)) }) }}
        </div>
        <ul class="month__rows">
          <li v-for="row in rows" :key="row.id" class="month__row">
            <ChatAvatar :chat-id="row.id" :title="row.title" :has-avatar="row.hasAvatar" size="sm" />
            <span class="month__name">{{ row.title }}</span>
            <span
              class="split month__split"
              role="img"
              :aria-label="t('month.rowShare', { name: row.title, share: formatPercent(row.share) })"
            >
              <span class="split__you" :style="{ width: `${row.share}%` }" />
              <span class="split__them" />
            </span>
            <span class="month__count t-num">{{ formatNumber(row.messages) }}</span>
          </li>
        </ul>
      </template>
      <p v-else class="tile__note">{{ t('month.empty') }}</p>
    </section>

    <component
      :is="reportIds.has(top.id) ? resolveComponent('NuxtLink') : 'section'"
      v-if="top"
      :to="reportIds.has(top.id) ? `/chat/${top.id}` : undefined"
      class="tile tile--lime span-4 month__top"
    >
      <div class="tile__label">{{ t('month.top') }}</div>
      <ChatAvatar :chat-id="top.id" :title="top.title" :has-avatar="top.hasAvatar" size="lg" class="month__avatar" />
      <div class="month__top-name">{{ top.title }}</div>
      <div class="tile__note">
        {{ tc('common.messagesCount', top.messages) }} ·
        {{ t('month.mine', { share: formatPercent(share(top.mine, top.messages)) }) }}
      </div>
    </component>
  </div>
</template>

<style scoped>
.month__main {
  min-height: 240px;
}

.month__rows {
  display: grid;
  gap: var(--space-2);
  margin: auto 0 0;
  padding: var(--space-3) 0 0;
  list-style: none;
}

.month__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) minmax(80px, 2fr) auto;
  align-items: center;
  gap: var(--space-3);
  font: var(--text-ui);
}

.month__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.month__count {
  min-width: 48px;
  color: var(--text-muted);
  text-align: right;
}

/* Your share against theirs, as in «Ваши люди». */
.split {
  display: flex;
  gap: 2px;
  height: 6px;
}

.split__you {
  border-radius: var(--radius-full) 0 0 var(--radius-full);
  background: var(--you);
}

.split__them {
  flex: 1;
  border-radius: 0 var(--radius-full) var(--radius-full) 0;
  background: var(--them);
}

.month__top {
  transition: transform var(--duration-press) var(--ease-standard);
}

a.month__top:active {
  transform: scale(var(--press-scale));
}

.month__avatar {
  margin-top: auto;
}

.month__top-name {
  overflow: hidden;
  font: var(--text-h2);
  letter-spacing: -0.035em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .month__main {
    min-height: 0;
  }
}

/* Phones: the lime tile becomes a row, avatar beside the name; the bar gives way to the count. */
@media (max-width: 640px) {
  .month__top {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    column-gap: var(--space-3);
  }

  .month__top .tile__label {
    grid-column: 1 / -1;
  }

  .month__top .month__avatar {
    grid-row: span 2;
    margin-top: 0;
  }

  .month__row {
    grid-template-columns: auto minmax(0, 1fr) 64px auto;
  }
}
</style>

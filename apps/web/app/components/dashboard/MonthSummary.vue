<script setup lang="ts">
import type { RecentActivityResponse } from '@tg-analyzer/shared'

/**
 * The top of the home page: private chats of the last month, counted by
 * Telegram without an analysis. The ink tile lists the busiest people; the
 * lime tile says what to do next — the busiest chat that has no report yet.
 * When every busy chat has a report, the lime tile names the busiest person
 * and that person leaves the ink list, so nothing is said twice.
 */
const props = defineProps<{ recent: RecentActivityResponse; reportIds: Set<string> }>()
const { t, tc, formatNumber, formatPercent, formatRelative } = useI18n()
const analysis = useAnalysis()
const auth = useAuthStore()
const toast = useToast()
const errorMessage = useErrorMessage()
const { relogin } = useAuth()

const ROWS = 5

const total = computed(() => props.recent.chats.reduce((sum, chat) => sum + chat.messages, 0))
const mine = computed(() => props.recent.chats.reduce((sum, chat) => sum + chat.mine, 0))

/** The busiest chat of the month without a report, and its place in the month. */
const next = computed(() => {
  const index = props.recent.chats.findIndex((chat) => !props.reportIds.has(chat.id))
  return index === -1 ? null : { chat: props.recent.chats[index]!, rank: index + 1 }
})
// With one chat the lime tile would only repeat the single row.
const top = computed(() => (!next.value && props.recent.chats.length > 1 ? props.recent.chats[0]! : null))
const rows = computed(() =>
  props.recent.chats
    .filter((chat) => chat.id !== top.value?.id)
    .slice(0, ROWS)
    .map((chat) => ({ ...chat, share: (chat.mine / chat.messages) * 100 })),
)
const share = (value: number, of: number) => (of ? (value / of) * 100 : 0)

const starting = ref(false)
const nextState = computed(() => {
  const id = next.value?.chat.id
  if (!id) return null
  if (analysis.isActive.value && analysis.progress.value.chatId === id) return 'running'
  if (analysis.queued.value.some((item) => item.chatId === id)) return 'queued'
  return null
})

async function analyseNext() {
  if (!next.value) return
  starting.value = true
  try {
    await analysis.startAnalysis(next.value.chat.id, next.value.chat.title)
  } catch (error) {
    toast.error(t('analysis.startError'), errorMessage(error))
  } finally {
    starting.value = false
  }
}
</script>

<template>
  <div class="bento month">
    <section class="tile tile--ink month__main" :class="next || top ? 'span-8' : 'span-12'">
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

    <section v-if="next" class="tile tile--lime span-4 month__top month__top--next" aria-labelledby="month-next">
      <div class="tile__label">{{ t('month.next') }}</div>
      <ChatAvatar
        :chat-id="next.chat.id"
        :title="next.chat.title"
        :has-avatar="next.chat.hasAvatar"
        size="lg"
        class="month__avatar"
      />
      <h2 id="month-next" class="month__top-name">{{ next.chat.title }}</h2>
      <p class="tile__note month__rank">
        {{ next.rank === 1 ? t('month.rankFirst') : t('month.rank', { rank: next.rank }) }}
      </p>
      <!-- Phones: one line instead of the facts. -->
      <p class="tile__note month__compact t-num">{{ tc('month.perMonth', next.chat.messages) }}</p>
      <dl class="month__facts">
        <div>
          <dt>{{ t('month.factMessages') }}</dt>
          <dd class="t-num">{{ tc('common.messagesCount', next.chat.messages) }}</dd>
        </div>
        <div v-if="next.chat.lastMessageAt">
          <dt>{{ t('month.factLast') }}</dt>
          <dd>{{ formatRelative(next.chat.lastMessageAt) }}</dd>
        </div>
      </dl>
      <UiButton v-if="!auth.telegramSessionActive" variant="primary" class="month__action" @click="relogin">
        {{ t('common.relogin') }}
      </UiButton>
      <UiButton
        v-else
        variant="primary"
        class="month__action"
        :loading="starting || nextState === 'running'"
        :disabled="nextState !== null"
        @click="analyseNext"
      >
        <template v-if="nextState === 'queued'">{{ t('month.queued') }}</template>
        <template v-else>
          <span class="month__action-long">{{ t('month.analyse') }}</span>
          <span class="month__action-short">{{ t('month.analyseShort') }}</span>
        </template>
      </UiButton>
    </section>

    <component
      :is="reportIds.has(top.id) ? resolveComponent('NuxtLink') : 'section'"
      v-else-if="top"
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

/* «Not analysed yet»: the facts and the button sit at the bottom, the avatar stays near the label. */
.month__top--next .month__avatar {
  margin-top: var(--space-3);
}

.month__facts {
  display: grid;
  gap: var(--space-2);
  margin: auto 0 0;
  padding-top: var(--space-3);
  border-top: 1px solid var(--on-lime-line);
  font: var(--text-small);
}

.month__facts div {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}

.month__facts dt {
  color: var(--text-muted);
}

.month__facts dd {
  margin: 0;
  font-weight: 600;
}

.month__action {
  width: 100%;
  margin-top: var(--space-2);
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

.month__compact,
.month__action-short {
  display: none;
}

/* Phones: the lime tile becomes a row, avatar beside the name; the bar gives way to the count. */
@media (max-width: 640px) {
  /* «Not analysed yet» as one row: avatar, label over name over the count, the button on the right. */
  .month__top.month__top--next {
    grid-template-columns: auto minmax(0, 1fr) auto;
    grid-template-rows: auto auto auto;
    row-gap: 2px;
    padding: var(--space-4);
  }

  .month__top.month__top--next .tile__label {
    grid-column: 2;
    grid-row: 1;
  }

  .month__top.month__top--next .month__avatar {
    grid-column: 1;
    grid-row: 1 / 4;
  }

  .month__top.month__top--next .month__top-name {
    grid-column: 2;
    font: var(--text-h3);
  }

  .month__top.month__top--next .month__compact {
    display: block;
    grid-column: 2;
  }

  .month__top.month__top--next .month__rank,
  .month__top.month__top--next .month__facts {
    display: none;
  }

  .month__top.month__top--next .month__action {
    grid-column: 3;
    grid-row: 1 / 4;
    width: auto;
    margin-top: 0;
  }

  .month__action-long {
    display: none;
  }

  .month__action-short {
    display: inline;
  }

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

  .month__top .month__facts,
  .month__top .month__action {
    grid-column: 1 / -1;
  }

  .month__row {
    grid-template-columns: auto minmax(0, 1fr) 64px auto;
  }
}
</style>

<script setup lang="ts">
import type { RecentActivityResponse } from '@tg-analyzer/shared'

/**
 * The top of the home page: private chats of the last month, counted by
 * Telegram without an analysis. The ink tile is a podium of the three busiest
 * people; the lime tile says what to do next — the busiest chat that has no
 * report yet. When every busy chat has a report, the lime tile names the
 * busiest person and that person leaves the podium, so nothing is said twice.
 */
const props = defineProps<{ recent: RecentActivityResponse; reportIds: Set<string> }>()
const { t, tc, formatNumber, formatPercent } = useI18n()
const analysis = useAnalysis()
const auth = useAuthStore()
const toast = useToast()
const errorMessage = useErrorMessage()
const { relogin } = useAuth()

/** The podium: three places, no more. */
const PLACES = 3

/** The busiest chat of the month without a report, and its place in the month. */
const next = computed(() => {
  const index = props.recent.chats.findIndex((chat) => !props.reportIds.has(chat.id))
  return index === -1 ? null : { chat: props.recent.chats[index]!, rank: index + 1 }
})
// With one chat the lime tile would only repeat the single row.
const top = computed(() => (!next.value && props.recent.chats.length > 1 ? props.recent.chats[0]! : null))
// The places keep their numbers when the busiest person moves to the lime tile.
const rows = computed(() => {
  const leader = props.recent.chats[0]?.messages || 1
  return props.recent.chats
    .map((chat, index) => ({ ...chat, place: index + 1, level: (chat.messages / leader) * 100 }))
    .filter((chat) => chat.id !== top.value?.id)
    .slice(0, PLACES)
})
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
      <div class="tile__label">{{ t('month.leaders') }}</div>
      <ol v-if="rows.length" class="month__rows">
        <li v-for="row in rows" :key="row.id" class="month__row">
          <span class="month__place t-num" :class="{ 'month__place--first': row.place === 1 }">{{ row.place }}</span>
          <ChatAvatar :chat-id="row.id" :title="row.title" :has-avatar="row.hasAvatar" size="sm" />
          <span class="month__who">
            <span class="month__name">{{ row.title }}</span>
            <span
              class="month__bar"
              role="img"
              :aria-label="t('month.rowShare', { name: row.title, share: formatPercent(row.level) })"
            >
              <span :style="{ width: `${row.level}%` }" />
            </span>
          </span>
          <span class="month__count t-num">{{ formatNumber(row.messages) }}</span>
        </li>
      </ol>
      <p v-else class="tile__note">{{ t('month.empty') }}</p>
    </section>

    <section v-if="next" class="tile tile--lime span-4 month__top" aria-labelledby="month-next">
      <div class="tile__label">{{ t('month.next') }}</div>
      <div class="month__head">
        <ChatAvatar :chat-id="next.chat.id" :title="next.chat.title" :has-avatar="next.chat.hasAvatar" size="md" />
        <div class="month__copy">
          <h2 id="month-next" class="month__top-name">{{ next.chat.title }}</h2>
          <p class="tile__note t-num">
            {{ tc('month.perMonth', next.chat.messages) }}<br />
            {{ next.rank === 1 ? t('month.rankFirst') : t('month.rank', { rank: next.rank }) }}
          </p>
        </div>
      </div>
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
        <template v-else>{{ t('month.analyse') }}</template>
      </UiButton>
    </section>

    <component
      :is="reportIds.has(top.id) ? resolveComponent('NuxtLink') : 'section'"
      v-else-if="top"
      :to="reportIds.has(top.id) ? `/chat/${top.id}` : undefined"
      class="tile tile--lime span-4 month__top"
    >
      <div class="tile__label">{{ t('month.top') }}</div>
      <div class="month__head">
        <ChatAvatar :chat-id="top.id" :title="top.title" :has-avatar="top.hasAvatar" size="md" />
        <div class="month__copy">
          <div class="month__top-name">{{ top.title }}</div>
          <div class="tile__note t-num">
            {{ tc('common.messagesCount', top.messages) }} ·
            {{ t('month.mine', { share: formatPercent(share(top.mine, top.messages)) }) }}
          </div>
        </div>
      </div>
    </component>
  </div>
</template>

<style scoped>
/* A podium of three rows: as tall as its rows, no filler. */
.month__rows {
  display: grid;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.month__row {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  font: var(--text-ui);
}

/* The place: a small disc, the first one filled. */
.month__place {
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  background: var(--on-tile-ink-well);
  font: var(--text-label);
  font-weight: 600;
}

.month__place--first {
  background: var(--lime);
  color: var(--on-lime);
}

.month__who {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.month__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* The rating bar: each person against the busiest one. */
.month__bar {
  display: block;
  height: 4px;
  border-radius: var(--radius-full);
  background: var(--on-tile-ink-well);
}

.month__bar span {
  display: block;
  height: 100%;
  border-radius: var(--radius-full);
  background: var(--them);
}

.month__count {
  min-width: 40px;
  color: var(--text-muted);
  text-align: right;
}

.month__top {
  justify-content: space-between;
  transition: transform var(--duration-fast) var(--ease-standard);
}

a.month__top:active {
  transform: scale(var(--press-scale));
}

.month__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.month__copy {
  display: grid;
  min-width: 0;
}

.month__top-name {
  overflow: hidden;
  font: var(--text-h3);
  letter-spacing: -0.03em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.month__action {
  width: 100%;
}
</style>

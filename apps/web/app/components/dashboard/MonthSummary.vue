<script setup lang="ts">
import type { RecentActivityResponse } from '@tg-analyzer/shared'
import { ArrowDown, ArrowUp } from '../../lib/icons'

/**
 * The top of the home page: a chart of the month, like a music chart. Private chats of the last
 * month, counted by Telegram without an analysis, ranked by messages in the month; the arrow says
 * how a chat moved against its place by size over all time (among the same chats). One column, the
 * same row for every place; a slim lime strip under the chart offers the busiest chat that has no report yet.
 */
const props = defineProps<{ recent: RecentActivityResponse; reportIds: Set<string> }>()
const { t, tc, formatNumber } = useI18n()
const analysis = useAnalysis()
const auth = useAuthStore()
const toast = useToast()
const errorMessage = useErrorMessage()
const { relogin } = useAuth()

/** Places in the chart: the leader and four more. */
const PLACES = 5

const rows = computed(() => {
  const chats = props.recent.chats
  // Older cached answers have no all-time size: then there is nothing to move against.
  const sized = chats.every((chat) => chat.total !== undefined)
  const byTotal = sized ? [...chats].sort((a, b) => (b.total ?? 0) - (a.total ?? 0)).map((chat) => chat.id) : []
  return chats.slice(0, PLACES).map((chat, index) => ({
    ...chat,
    place: index + 1,
    move: sized ? byTotal.indexOf(chat.id) - index : 0,
    reported: props.reportIds.has(chat.id),
  }))
})

/** The busiest chat of the month without a report, and its place in the month. */
const next = computed(() => {
  const index = props.recent.chats.findIndex((chat) => !props.reportIds.has(chat.id))
  return index === -1 ? null : { chat: props.recent.chats[index]!, rank: index + 1 }
})

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

const link = (row: { id: string; reported: boolean }) => (row.reported ? `/chat/${row.id}` : undefined)
const tag = (row: { reported: boolean }) => (row.reported ? resolveComponent('NuxtLink') : 'div')
</script>

<template>
  <div class="month">
    <section class="tile tile--ink month__chart" aria-labelledby="month-title">
      <div class="tile__label">
        <h2 id="month-title" class="month__label">{{ t('month.chart') }}</h2>
        <span class="t-num">{{ tc('month.window', recent.days) }}</span>
      </div>

      <ol v-if="rows.length" class="month__rows">
        <li v-for="row in rows" :key="row.id">
          <component :is="tag(row)" :to="link(row)" class="month__row">
            <span class="month__place t-num">{{ row.place }}</span>
            <span
              class="month__move t-num"
              :class="{ 'month__move--up': row.move > 0 }"
              :aria-label="
                row.move > 0
                  ? t('month.moveUp', { count: row.move })
                  : row.move < 0
                    ? t('month.moveDown', { count: -row.move })
                    : undefined
              "
            >
              <template v-if="row.move > 0"><ArrowUp aria-hidden="true" />{{ row.move }}</template>
              <template v-else-if="row.move < 0"><ArrowDown aria-hidden="true" />{{ -row.move }}</template>
              <template v-else>–</template>
            </span>
            <ChatAvatar :chat-id="row.id" :title="row.title" :has-avatar="row.hasAvatar" size="sm" />
            <span class="month__who">
              <span class="month__name">{{ row.title }}</span>
              <span class="month__sub">
                <span v-if="!row.reported" class="month__fresh">{{ t('month.notReported') }}</span>
                <template v-else-if="row.total">{{
                  t('month.allTimeTotal', { count: formatNumber(row.total) })
                }}</template>
              </span>
            </span>
            <span class="month__count t-num">{{ formatNumber(row.messages) }}</span>
          </component>
        </li>
      </ol>
      <p v-else class="tile__note">{{ t('month.empty') }}</p>
    </section>

    <section v-if="next" class="tile tile--lime month__next" aria-labelledby="month-next">
      <ChatAvatar :chat-id="next.chat.id" :title="next.chat.title" :has-avatar="next.chat.hasAvatar" size="md" />
      <div class="month__next-copy">
        <span class="month__next-label">{{ t('month.next') }}</span>
        <h2 id="month-next" class="month__next-name">{{ next.chat.title }}</h2>
        <p class="month__next-note">
          {{ next.rank === 1 ? t('month.rankFirst') : t('month.rank', { rank: next.rank }) }} ·
          {{ tc('month.perMonth', next.chat.messages) }}
        </p>
      </div>
      <UiButton v-if="!auth.telegramSessionActive" class="month__action" @click="relogin">
        {{ t('common.relogin') }}
      </UiButton>
      <UiButton
        v-else
        class="month__action"
        :loading="starting || nextState === 'running'"
        :disabled="nextState !== null"
        @click="analyseNext"
      >
        <template v-if="nextState === 'queued'">{{ t('month.queued') }}</template>
        <template v-else>{{ t('month.analyse') }}</template>
      </UiButton>
    </section>
  </div>
</template>

<style scoped>
.month {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--card-gap);
}

.month__chart {
  gap: var(--space-4);
}

.month__label {
  font: inherit;
}

.month__place {
  font: var(--text-h3);
  letter-spacing: -0.02em;
}

.month__rows {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.month__rows li + li {
  border-top: 1px solid var(--border);
}

.month__row {
  display: grid;
  grid-template-columns: 1em 2.4em auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  padding-block: var(--space-2);
  color: inherit;
  text-decoration: none;
}

.month__rows li:first-child .month__row {
  padding-top: 0;
}

.month__rows li:last-child .month__row {
  padding-bottom: 0;
}

.month__move {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: var(--text-muted);
  font: var(--text-caption);
  font-weight: 600;
}

.month__move svg {
  width: 12px;
  height: 12px;
  stroke-width: 2.4;
}

.month__move--up {
  color: var(--them);
}

.month__who {
  display: grid;
  min-width: 0;
}

.month__name {
  overflow: hidden;
  font: var(--text-title);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.month__sub {
  color: var(--text-muted);
  font: var(--text-caption);
  font-variant-numeric: tabular-nums;
}

/* «Не разобран» inside the ink tile: the lime of the ink tile, as a dot and a word. */
.month__fresh {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--them);
  font: var(--text-caption);
  font-weight: 500;
}

.month__fresh::before {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: currentColor;
  content: '';
}

.month__count {
  font: var(--text-title);
}

@media (hover: hover) and (pointer: fine) {
  a.month__row:hover .month__name {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
}

/* The next chat: one slim strip, not a tall tile. */
.month__next {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3) var(--space-4);
  padding-block: var(--space-4);
}

.month__next-copy {
  display: grid;
  min-width: 0;
}

.month__next-label,
.month__next-note {
  color: var(--text-muted);
  font: var(--text-caption);
  font-variant-numeric: tabular-nums;
}

.month__next-name {
  overflow: hidden;
  font: var(--text-title);
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 520px) {
  .month__next {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .month__action {
    grid-column: 1 / -1;
  }
}
</style>

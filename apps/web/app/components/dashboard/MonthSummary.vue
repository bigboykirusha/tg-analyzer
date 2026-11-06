<script setup lang="ts">
import type { RecentActivityResponse } from '@tg-analyzer/shared'
import { Plus } from '../../lib/icons'

/**
 * The month chart: the five busiest private chats. A row with a report opens it; a row without
 * one starts its analysis right here, so every chat has one entry on the home page.
 */
const props = defineProps<{ recent: RecentActivityResponse; reportIds: Set<string> }>()
const { t, formatNumber } = useI18n()
const analysis = useAnalysis()
const auth = useAuthStore()
const toast = useToast()
const errorMessage = useErrorMessage()
const { relogin } = useAuth()

/** Places in the chart: the leader and four more. */
const PLACES = 5

const rows = computed(() => {
  const chats = props.recent.chats
  return chats.slice(0, PLACES).map((chat, index) => ({
    ...chat,
    place: index + 1,
    reported: props.reportIds.has(chat.id),
  }))
})
type Row = (typeof rows.value)[number]

/** Without a Telegram session nothing can be analysed: the rows stay quiet and one line says why. */
const canAnalyse = computed(() => auth.telegramSessionActive)
const waiting = computed(() => rows.value.some((row) => !row.reported))

const starting = ref<string | null>(null)
function state(row: Row) {
  if (analysis.isActive.value && analysis.progress.value.chatId === row.id) return 'running'
  if (analysis.queued.value.some((item) => item.chatId === row.id)) return 'queued'
  if (starting.value === row.id) return 'starting'
  return null
}

async function analyse(row: Row) {
  if (state(row)) return
  starting.value = row.id
  try {
    await analysis.startAnalysis(row.id, row.title)
  } catch (error) {
    toast.error(t('analysis.startError'), errorMessage(error))
  } finally {
    starting.value = null
  }
}

function tag(row: Row) {
  if (row.reported) return resolveComponent('NuxtLink')
  return canAnalyse.value ? 'button' : 'div'
}
function attrs(row: Row) {
  if (row.reported) return { to: `/chat/${row.id}` }
  if (!canAnalyse.value) return {}
  return { type: 'button', disabled: state(row) !== null, onClick: () => analyse(row) }
}
</script>

<template>
  <section class="tile tile--ink month" aria-labelledby="month-title">
    <div class="tile__label">
      <h2 id="month-title" class="month__label">{{ t('month.chart') }}</h2>
    </div>

    <ol v-if="rows.length" class="month__rows">
      <li v-for="row in rows" :key="row.id">
        <component
          :is="tag(row)"
          v-bind="attrs(row)"
          class="month__row"
          :class="{ 'month__row--first': row.place === 1, 'month__row--action': !row.reported && canAnalyse }"
        >
          <span class="month__place t-num">{{ row.place }}</span>
          <ChatAvatar
            :chat-id="row.id"
            :title="row.title"
            :has-avatar="row.hasAvatar"
            :size="row.place === 1 ? 'md' : 'sm'"
          />
          <span class="month__who">
            <span class="month__name">{{ row.title }}</span>
            <span class="month__sub">
              <template v-if="row.reported">{{
                row.total ? t('month.allTimeTotal', { count: formatNumber(row.total) }) : ''
              }}</template>
              <span v-else-if="state(row) === 'running' || state(row) === 'starting'" class="month__fresh">
                <span class="spinner" aria-hidden="true" />{{ t('dashboard.analysingNow') }}
              </span>
              <span v-else-if="state(row) === 'queued'" class="month__fresh">{{ t('month.queued') }}</span>
              <span v-else-if="canAnalyse" class="month__fresh month__fresh--action">
                <Plus aria-hidden="true" />{{ t('month.analyse') }}
              </span>
              <span v-else class="month__fresh month__fresh--dot">{{ t('month.notReported') }}</span>
            </span>
          </span>
          <span class="month__count t-num">{{ formatNumber(row.messages) }}</span>
        </component>
      </li>
    </ol>
    <p v-else class="tile__note">{{ t('month.empty') }}</p>

    <div v-if="!canAnalyse && waiting" class="month__session">
      <p>{{ t('login.sessionEnded') }}</p>
      <UiButton size="sm" @click="relogin">{{ t('common.relogin') }}</UiButton>
    </div>
  </section>
</template>

<style scoped>
.month {
  gap: var(--space-4);
}

.month__label {
  font: inherit;
}

.month__place {
  font: var(--text-h3);
  letter-spacing: var(--tracking-h3);
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
  grid-template-columns: 1.1em 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding-block: var(--space-2);
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  text-decoration: none;
}

button.month__row {
  cursor: pointer;
}

button.month__row:disabled {
  cursor: default;
  opacity: 1;
}

/* The leader: a lime-lined well, a bigger avatar and count, its place in lime. */
.month__rows li:first-child {
  margin: 0 calc(var(--space-3) * -1) var(--space-2);
  border-radius: var(--radius-md);
  background: var(--on-tile-ink-well);
}

.month__rows li:first-child + li {
  border-top: 0;
}

.month__row--first {
  padding: var(--space-3);
}

.month__row--first .month__place,
.month__row--first .month__count {
  color: var(--them);
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
}

.month__row--first .month__name {
  font: var(--text-h3);
  letter-spacing: var(--tracking-h3);
}

.month__rows li:last-child .month__row {
  padding-bottom: 0;
}

.month__row :deep(.avatar),
.month__row > :nth-child(2) {
  justify-self: center;
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

/* A chat without a report, in the lime of the ink tile: «+ Разобрать чат», its progress, or a dot and a word. */
.month__fresh {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--them);
  font: var(--text-caption);
}

.month__fresh :deep(svg.lucide) {
  --icon-size: 12px;
}

.month__fresh--dot::before {
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
  a.month__row:hover .month__name,
  button.month__row:enabled:hover .month__name {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
}

/* Without a Telegram session: one line and the way back in, at the foot of the chart. */
.month__session {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font: var(--text-small);
}
</style>

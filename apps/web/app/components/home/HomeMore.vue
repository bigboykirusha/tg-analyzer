<script setup lang="ts">
import { Search } from '../../lib/icons'

/**
 * «Разобрать ещё»: what else to analyse, as a row of people over the reports — the way Telegram lays out its
 * stories. First «Все чаты Telegram» (the picker: a sheet on a phone, «Новый анализ» on a computer), then the
 * chat being analysed and those waiting, then the busiest chats of the month without a report. A tap starts the
 * analysis; while it runs, that person's circle fills with a ring and the percentage, and a tap opens its
 * details (where it can be cancelled). Nothing floats over the page: the action lives where the people are.
 */
const { t, formatNumber } = useI18n()
const workspace = useWorkspaceStore()
const analysis = useAnalysis()
const view = useAnalysisView()
const actions = useReportActions()
const isPhone = useMediaQuery('(max-width: 900px)')
const route = useRoute()
const detailsOpen = ref(false)

const MAX = 12
const R = 31
const C = 2 * Math.PI * R

const allChats = computed(() => (isPhone.value ? { query: { ...route.query, pick: null } } : '/new'))

interface Person {
  id: string
  title: string
  hasAvatar?: boolean
}

const people = computed<Person[]>(() => {
  const out: Person[] = []
  const seen = new Set<string>()
  const add = (person: Person | null) => {
    if (!person || seen.has(person.id)) return
    seen.add(person.id)
    out.push(person)
  }
  const progress = analysis.progress.value
  if (analysis.isActive.value && progress.chatId) add({ id: progress.chatId, title: progress.chatTitle ?? '' })
  for (const item of analysis.queued.value) add({ id: item.chatId, title: item.chatTitle ?? '' })
  for (const chat of workspace.suggestions) add({ id: chat.id, title: chat.title, hasAvatar: chat.hasAvatar })
  return out.slice(0, MAX)
})

const reading = (id: string) => analysis.isActive.value && analysis.progress.value.chatId === id
const waiting = (id: string) => analysis.queued.value.some((item) => item.chatId === id)
const firstName = (title: string) => title.split(/\s+/)[0] || title
const percent = computed(() => view.value?.percent ?? null)

function tap(person: Person) {
  if (reading(person.id)) detailsOpen.value = true
  else if (!waiting(person.id)) void actions.analyse(person.id, person.title)
}

const loading = computed(() => !workspace.recent && workspace.recentState === 'loading')
</script>

<template>
  <section class="more" :aria-label="t('home.moreTitle')">
    <h2 class="t-h3 more__title">{{ t('home.moreTitle') }}</h2>
    <ul class="more__row">
      <li>
        <NuxtLink :to="allChats" class="more__person" :aria-label="t('home.allChats')">
          <span class="more__circle more__circle--all" aria-hidden="true"><Search /></span>
          <span class="more__name">{{ t('home.allShort') }}</span>
        </NuxtLink>
      </li>
      <template v-if="loading">
        <li v-for="item in 4" :key="`s${item}`" aria-hidden="true" class="more__person">
          <UiSkeleton width="var(--avatar-lg)" height="var(--avatar-lg)" radius="var(--radius-pill)" />
          <UiSkeleton width="var(--space-10)" height="var(--space-3)" />
        </li>
      </template>
      <li v-for="person in people" :key="person.id">
        <button
          type="button"
          class="more__person"
          :aria-label="
            reading(person.id)
              ? t('home.moreReading', { name: person.title, percent: percent === null ? '…' : formatNumber(percent) })
              : waiting(person.id)
                ? t('home.moreQueued', { name: person.title })
                : t('home.unanalysedAction', { name: person.title })
          "
          :aria-haspopup="reading(person.id) ? 'dialog' : undefined"
          @click="tap(person)"
        >
          <span class="more__circle" :class="{ 'is-busy': reading(person.id) || waiting(person.id) }">
            <ChatAvatar :chat-id="person.id" :title="person.title" :has-avatar="person.hasAvatar" size="lg" />
            <svg v-if="reading(person.id)" class="more__ring" viewBox="0 0 68 68" aria-hidden="true">
              <circle class="more__track" cx="34" cy="34" :r="R" />
              <circle
                class="more__value"
                cx="34"
                cy="34"
                :r="R"
                :stroke-dasharray="C"
                :stroke-dashoffset="C * (1 - (percent ?? 4) / 100)"
              />
            </svg>
          </span>
          <span class="more__name" :class="{ 'more__name--busy': reading(person.id) }" aria-hidden="true">{{
            reading(person.id)
              ? percent === null
                ? t('home.moreStarting')
                : `${formatNumber(percent)}%`
              : waiting(person.id)
                ? t('dashboard.queued')
                : firstName(person.title)
          }}</span>
        </button>
      </li>
    </ul>
    <AnalysisDetails :open="detailsOpen" @close="detailsOpen = false" />
  </section>
</template>

<style scoped>
.more {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 0;
}

/* The row runs to the screen's edges on a phone and scrolls sideways; its first circle stays on the text column. */
.more__row {
  display: flex;
  gap: var(--space-3);
  margin-inline: calc(-1 * var(--page-gutter));
  padding: var(--space-1) var(--page-gutter);
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
}

.more__row::-webkit-scrollbar {
  display: none;
}

.more__row > li {
  flex: none;
  scroll-snap-align: start;
}

.more__person {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  width: calc(var(--avatar-lg) + var(--space-2));
  color: var(--text);
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--duration-press) var(--ease-standard);
}

.more__person:active {
  transform: scale(var(--press-scale));
}

.more__circle {
  position: relative;
  display: grid;
  place-items: center;
  width: var(--avatar-lg);
  height: var(--avatar-lg);
  border-radius: var(--radius-pill);
}

.more__circle--all {
  background: var(--surface);
  box-shadow: var(--ring-card);
  --icon-size: var(--icon-lg);
}

/* A chat being read or waiting steps back a little, so its ring and its label are what you see. */
.more__circle.is-busy :deep(.avatar) {
  transform: scale(0.84);
  transition: transform var(--transition-fast);
}

.more__ring {
  position: absolute;
  inset: calc(-1 * var(--space-0-5));
  width: calc(100% + var(--space-1));
  height: calc(100% + var(--space-1));
  transform: rotate(-90deg);
  pointer-events: none;
}

.more__track,
.more__value {
  fill: none;
  stroke-width: 3;
}

.more__track {
  stroke: var(--border-strong);
}

.more__value {
  stroke: var(--text);
  stroke-linecap: round;
  transition: stroke-dashoffset var(--duration-sheet) var(--ease-standard);
}

.more__name {
  max-width: 100%;
  overflow: hidden;
  color: var(--text-muted);
  font: var(--text-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more__name--busy {
  color: var(--text);
}

@media (hover: hover) and (pointer: fine) {
  .more__person:hover .more__circle--all {
    background: var(--surface-2);
  }
}

@media (min-width: 901px) {
  .more__row {
    margin-inline: 0;
    padding-inline: 0;
    flex-wrap: wrap;
    overflow: visible;
  }
}

@media (prefers-reduced-motion: reduce) {
  .more__value,
  .more__circle.is-busy :deep(.avatar) {
    transition: none;
  }
}
</style>

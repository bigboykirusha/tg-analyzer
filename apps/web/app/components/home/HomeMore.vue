<script setup lang="ts">
import { Search } from '../../lib/icons'

/**
 * «Разобрать ещё»: what else to analyse, as a row of people under the reports (a phone and a computer) — the way Telegram lays out its
 * stories. First «Все чаты Telegram» (the picker: a sheet on a phone, «Новый анализ» on a computer), then the
 * chats waiting their turn, then the busiest chats of the month without a report. A tap starts the analysis; the
 * chat being read is not here — it is already its tile among the reports (AnalysisTile, 14.11). Nothing floats over
 * the page: the action lives where the people are.
 */
const { t } = useI18n()
const workspace = useWorkspaceStore()
const analysis = useAnalysis()
const actions = useReportActions()
const isPhone = useMediaQuery('(max-width: 900px)')
const route = useRoute()

const MAX = 12

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
  // The chat being read is its growing tile above.
  const progress = analysis.progress.value
  if (analysis.isActive.value && progress.chatId) seen.add(progress.chatId)
  for (const item of analysis.queued.value) add({ id: item.chatId, title: item.chatTitle ?? '' })
  for (const chat of workspace.suggestions) add({ id: chat.id, title: chat.title, hasAvatar: chat.hasAvatar })
  return out.slice(0, MAX)
})

const waiting = (id: string) => analysis.queued.value.some((item) => item.chatId === id)
const firstName = (title: string) => title.split(/\s+/)[0] || title

function tap(person: Person) {
  if (!waiting(person.id)) void actions.analyse(person.id, person.title)
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
            waiting(person.id)
              ? t('home.moreQueued', { name: person.title })
              : t('home.unanalysedAction', { name: person.title })
          "
          @click="tap(person)"
        >
          <span class="more__circle" :class="{ 'is-busy': waiting(person.id) }">
            <ChatAvatar :chat-id="person.id" :title="person.title" :has-avatar="person.hasAvatar" size="lg" />
          </span>
          <span class="more__name" aria-hidden="true">{{
            waiting(person.id) ? t('dashboard.queued') : firstName(person.title)
          }}</span>
        </button>
      </li>
    </ul>
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
  /* Snapping aligns to the padding edge, not the scroll box's edge: without it the first circle sits on the screen's edge. */
  scroll-padding-inline: var(--page-gutter);
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

/* A chat waiting its turn steps back a little, so its label is what you see. */
.more__circle.is-busy :deep(.avatar) {
  transform: scale(0.84);
  transition: transform var(--transition-fast);
}

.more__name {
  max-width: 100%;
  overflow: hidden;
  color: var(--text-muted);
  font: var(--text-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
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
  .more__circle.is-busy :deep(.avatar) {
    transition: none;
  }
}
</style>

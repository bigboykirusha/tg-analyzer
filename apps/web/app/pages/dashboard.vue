<script setup lang="ts">
import type { ParseProgressDto } from '@tg-analyzer/shared'
import { AlertCircle } from '../lib/icons'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

/**
 * Home is what you have already learned: the reports, one poster tile each (two to a row on a phone, a long name
 * across the row), new messages in the chat as a badge on the tile. A running analysis is the tile its report will
 * be, its pulse drawn as the history is read (AnalysisTile). News about them (a quiz answered, a link opened)
 * is in «Уведомления», behind the bell. What else to analyse: on a computer the row «Разобрать ещё» under the
 * reports; on a phone the chat list as a sheet resting at the bottom (HomeChatsSheet), pulled up to the whole screen.
 * A newcomer gets «С кого начнём?» instead.
 */
const { t } = useI18n()
useSeoMeta({ title: () => t('dashboard.title') })

const workspace = useWorkspaceStore()
/** As many skeleton tiles as there were reports last time (two when unknown). */
const skeletonCards = computed(() => Math.min(8, workspace.reportsHint || 2))
const errorMessage = useErrorMessage()
/** Phones and tablets: the chat list is a sheet resting at the bottom (HomeChatsSheet). */
const narrow = useMediaQuery('(max-width: 900px)')

/** The reports in the order the sidebar shows them too: pinned in Telegram first, then the freshest. */
const reports = computed(() => workspace.reportChats)
const analysis = useAnalysis()
/**
 * A chat being analysed for the first time is on home already as the tile its report will be (AnalysisTile), where
 * the report will land: first among the pinned when the chat is pinned, else first after them. A chat read again
 * grows in its own tile (ReportCard).
 */
type Tile = { id: string; title: string; chat: (typeof reports.value)[number] | null; hasAvatar?: boolean }
/** Done a moment ago, the report list not reloaded yet: the tile holds its place, so nothing blinks or jumps. */
const landing = ref<ParseProgressDto | null>(null)
let landingTimer: ReturnType<typeof setTimeout> | undefined
watch(analysis.finished, (job) => {
  clearTimeout(landingTimer)
  landing.value = job?.status === 'completed' && job.chatId ? job : null
  // A report list that never brings it back (a failed reload) does not keep the tile for ever.
  if (landing.value) landingTimer = setTimeout(() => (landing.value = null), 15_000)
})
watch(reports, (list) => {
  if (landing.value && list.some((chat) => chat.id === landing.value?.chatId)) landing.value = null
})
onBeforeUnmount(() => clearTimeout(landingTimer))
const growing = computed<Tile | null>(() => {
  const job = analysis.isActive.value ? analysis.progress.value : landing.value
  const chatId = job?.chatId
  const chatTitle = job?.chatTitle
  if (!chatId || reports.value.some((chat) => chat.id === chatId)) return null
  const dialog = workspace.chats.find((chat) => chat.id === chatId)
  return {
    id: chatId,
    title: chatTitle ?? dialog?.title ?? '',
    chat: null,
    hasAvatar: dialog?.hasAvatar,
  }
})
const items = computed<Tile[]>(() => {
  const list: Tile[] = reports.value.map((chat) => ({ id: chat.id, title: chat.title, chat }))
  const tile = growing.value
  if (!tile) return list
  const pinned = workspace.chats.find((chat) => chat.id === tile.id)?.pinned
  const at = pinned ? 0 : list.findIndex((item) => !item.chat?.pinned)
  list.splice(at === -1 ? list.length : at, 0, tile)
  return list
})
const grid = ref<HTMLElement | null>(null)
/** Which tiles take the whole row on a phone: a name too long for a half tile, or a tile without a neighbour. */
const tiles = useTileRows(
  () => items.value,
  (item) => item.title,
  grid,
)

const loading = computed(
  () => !reports.value.length && workspace.reportsState !== 'ready' && workspace.reportsState !== 'error',
)
const failed = computed(() => !reports.value.length && workspace.reportsState === 'error')
/** A newcomer's first analysis is already a tile on home: «С кого начнём?» gives way to it. */
const newcomer = computed(() => !items.value.length && !loading.value && !failed.value)
const reportsError = ref<unknown>(null)
function loadReports() {
  reportsError.value = null
  void workspace.loadReports().catch((error) => (reportsError.value = error))
}

onMounted(() => {
  void workspace.loadDialogs()
  void workspace.loadRecent()
  loadReports()
})
</script>

<template>
  <UiPageContainer class="home">
    <!-- Loading: the same title and cards, so nothing moves when the content arrives. -->
    <div v-if="loading" class="page" aria-busy="true">
      <div class="home__hello" aria-hidden="true">
        <UiSkeleton width="min(70%, 360px)" height="var(--space-8)" />
        <UiSkeleton width="min(50%, 260px)" height="var(--space-4)" />
      </div>
      <section class="home__section" aria-hidden="true">
        <div class="home__reports">
          <HomeCard v-for="card in skeletonCards" :key="card" skeleton />
        </div>
      </section>
    </div>

    <div v-else-if="newcomer" class="page"><HomeFirstRun /></div>

    <div v-else class="page">
      <header class="home__hello">
        <h1 class="t-h1">{{ t('dashboard.reportsTitle') }}</h1>
        <p class="t-lede">{{ t('home.greeting.lede') }}</p>
      </header>

      <HomeBotPrompt />

      <section id="reports" class="home__section">
        <UiEmptyState
          v-if="failed"
          tone="danger"
          compact
          :icon="AlertCircle"
          :title="t('dashboard.reportsError')"
          :description="errorMessage(reportsError)"
        >
          <template #action>
            <UiButton @click="loadReports">{{ t('common.retry') }}</UiButton>
          </template>
        </UiEmptyState>
        <div v-else ref="grid" class="home__reports">
          <template v-for="{ item, wide } in tiles" :key="item.id">
            <ReportCard
              v-if="item.chat"
              :report="item.chat.report!"
              :has-avatar="item.chat.hasAvatar"
              :fresh="workspace.withNews[item.id]"
              :wide="wide"
            />
            <AnalysisTile v-else :has-avatar="item.hasAvatar" :wide="wide" :landing="landing" />
          </template>
        </div>
      </section>
      <!-- A computer: who else to analyse comes after what you already know, a hint under the reports. -->
      <HomeMore v-if="!narrow" />
      <HomeChatsSheet v-if="narrow" />
    </div>
  </UiPageContainer>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--page-gap);
}

.home__hello {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

/* Room at the end for the chat list's edge resting over the bottom of the screen. */
.home:has(.peek) {
  padding-bottom: calc(var(--peek-height) + env(safe-area-inset-bottom, 0px));
}

.home__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* Reports: two tiles to a row on a phone (a long name takes the row — useTileRows), three on a tablet and beside the
   sidebar on a laptop, four on wide screens — a tile never narrower than its name and its pulse need. */
.home__reports {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--card-gap);
}

@media (min-width: 641px) {
  .home__reports {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 901px) {
  .home__reports {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1200px) {
  .home__reports {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>

<script setup lang="ts">
import { AlertCircle } from '../lib/icons'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

/**
 * Home is what you have already learned: the reports, one poster tile each, new messages in the chat as a badge
 * on the tile. News about them (a quiz answered, a link opened) is in «Уведомления», behind the bell. What else to analyse is «Новый анализ» (the dock, the sidebar), not a second list here
 * that counts every chat's month on each visit. A newcomer gets «С кого начнём?» instead.
 */
const { t } = useI18n()
useSeoMeta({ title: () => t('dashboard.title') })

const workspace = useWorkspaceStore()
/** As many skeleton tiles as there were reports last time (two when unknown). */
const skeletonCards = computed(() => Math.min(8, workspace.reportsHint || 2))
const errorMessage = useErrorMessage()

/** The reports in the order the sidebar shows them too: pinned in Telegram first, then the freshest. */
const reports = computed(() => workspace.reportChats)

const loading = computed(
  () => !reports.value.length && workspace.reportsState !== 'ready' && workspace.reportsState !== 'error',
)
const failed = computed(() => !reports.value.length && workspace.reportsState === 'error')
const newcomer = computed(() => !reports.value.length && !loading.value && !failed.value)
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
          <HomeCard v-for="card in skeletonCards" :key="card" skeleton wide />
        </div>
      </section>
    </div>

    <div v-else-if="newcomer" class="page"><HomeFirstRun /></div>

    <div v-else class="page">
      <header class="home__hello">
        <h1 class="t-h1">{{ t('dashboard.reportsTitle') }}</h1>
        <p class="t-lede">{{ t('home.greeting.lede') }}</p>
      </header>

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
        <div v-else class="home__reports">
          <ReportCard
            v-for="chat in reports"
            :key="chat.id"
            :report="chat.report!"
            :has-avatar="chat.hasAvatar"
            :added="workspace.newMessages[chat.id]"
          />
        </div>
      </section>
    </div>
  </UiPageContainer>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--page-gap);
}

/* Phones keep the floating «Новый анализ» clear of the last row and card. */
@media (max-width: 900px) {
  .home .page {
    padding-bottom: var(--fab-clearance);
  }
}

.home__hello {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.home__section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

/* Reports: one wide tile per row on a phone, three on a tablet and beside the sidebar on a laptop, four on wide
   screens — a tile never narrower than its name and its pulse need. */
.home__reports {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
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

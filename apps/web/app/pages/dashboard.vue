<script setup lang="ts">
import { AlertCircle } from '../lib/icons'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

/**
 * Home answers two questions: what you have already learned (the reports, one card each, new messages in
 * the chat as a badge on the card) and what else can be analysed (the busiest chats without a report). A
 * newcomer gets «С кого начнём?» instead.
 */
const { t } = useI18n()
useSeoMeta({ title: () => t('dashboard.title') })

const workspace = useWorkspaceStore()
const auth = useAuthStore()
const now = useNow(60_000)
const errorMessage = useErrorMessage()

const greeting = computed(() => {
  const hour = new Date(now.value).getHours()
  const part = hour < 5 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'day' : hour < 23 ? 'evening' : 'night'
  const name = auth.user?.firstName?.trim()
  const hello = t(`home.greeting.${part}`)
  return name ? `${hello}, ${name}` : hello
})

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
    <!-- Loading: the same greeting and cards, so nothing moves when the content arrives. -->
    <div v-if="loading" class="page" aria-busy="true">
      <div class="home__hello" aria-hidden="true">
        <UiSkeleton width="min(70%, 360px)" height="var(--space-8)" />
        <UiSkeleton width="min(50%, 260px)" height="var(--space-4)" />
      </div>
      <section class="home__section" aria-hidden="true">
        <UiSkeleton width="96px" height="var(--space-6)" />
        <div class="home__reports">
          <HomeCard v-for="card in 4" :key="card" skeleton />
        </div>
      </section>
    </div>

    <div v-else-if="newcomer" class="page"><HomeFirstRun /></div>

    <div v-else class="page">
      <header class="home__hello">
        <h1 class="t-h1">{{ greeting }}</h1>
        <p class="t-lede">{{ t('home.greeting.lede') }}</p>
      </header>

      <UiPageSection id="reports" :title="t('dashboard.reportsTitle')">
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
      </UiPageSection>

      <!-- Without the reports we cannot tell which chats are still to analyse: no suggestions that may already have one. -->
      <HomeUnanalysed v-if="!failed" />
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

/* Reports: two on a phone, four on a tablet and wide screens, three beside the sidebar on a laptop. */
.home__reports {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--card-gap);
}

@media (min-width: 641px) {
  .home__reports {
    grid-template-columns: repeat(4, minmax(0, 1fr));
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

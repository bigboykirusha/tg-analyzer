<script setup lang="ts">
import { AlertCircle } from '../lib/icons'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

/**
 * Home is what you have already learned: «Новое» first when there is news (a quiz answer the owner has not seen —
 * it goes when the report is opened), then the reports, one poster tile each, new messages in the chat as a
 * badge on the tile. What else to analyse is «Новый анализ» (the dock, the sidebar), not a second list here
 * that counts every chat's month on each visit. A newcomer gets «С кого начнём?» instead.
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

/** «Новое»: quiz answers the owner has not seen yet, one row each; the row opens the report and clears it. */
const news = computed(() =>
  reports.value.flatMap((chat) => {
    const quiz = chat.report?.quiz
    if (!quiz) return []
    const subtitle =
      quiz.score === null
        ? t('dashboard.quizHidden')
        : t('dashboard.quizScore', { score: quiz.score, total: quiz.total })
    return [{ chat, subtitle }]
  }),
)

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

      <UiPageSection v-if="news.length" id="news" :title="t('dashboard.newsTitle')">
        <UiGroup>
          <UiListRow
            v-for="item in news"
            :key="item.chat.id"
            :to="`/chat/${item.chat.id}`"
            :title="item.chat.title"
            :subtitle="item.subtitle"
            chevron
          >
            <template #leading>
              <ChatAvatar :chat-id="item.chat.id" :title="item.chat.title" :has-avatar="item.chat.hasAvatar" />
            </template>
          </UiListRow>
        </UiGroup>
      </UiPageSection>

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

/* Reports: two on a phone, three on a tablet and beside the sidebar on a laptop, four on wide screens — a tile
   never narrower than its name and its pulse need. */
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

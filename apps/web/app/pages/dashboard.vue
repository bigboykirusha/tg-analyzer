<script setup lang="ts">
import { deriveHomeEvents, type UserShareLinkDto } from '@tg-analyzer/shared'
import { AlertCircle } from '../lib/icons'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

/**
 * Home answers two questions: what you have already learned (the reports) and what is new (the news
 * about your people). A greeting, «Сейчас главное», the reports as small posters, the busiest chats
 * still without one. A newcomer gets «С кого начнём?» instead.
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

/** The reports, chats pinned in Telegram first, then the freshest. */
const reports = computed(() =>
  workspace.chats
    .filter((chat) => chat.report)
    .sort(
      (left, right) =>
        Number(Boolean(right.pinned)) - Number(Boolean(left.pinned)) ||
        Date.parse(right.report!.analyzedAt) - Date.parse(left.report!.analyzedAt),
    ),
)
const links = ref<UserShareLinkDto[]>([])
async function loadLinks() {
  try {
    links.value = (await api('GET /api/v1/links')).links
  } catch {
    links.value = []
  }
}
const events = computed(() =>
  deriveHomeEvents(
    reports.value.map((chat) => chat.report!),
    workspace.recent,
    links.value,
  ).filter((event) => event.kind !== 'unanalysed'),
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
  void loadLinks()
  loadReports()
})
</script>

<template>
  <UiPageContainer class="home">
    <!-- Loading: the same greeting, tile and cards, so nothing moves when the content arrives. -->
    <div v-if="loading" class="page" aria-busy="true">
      <div class="home__hello" aria-hidden="true">
        <UiSkeleton width="min(70%, 360px)" height="var(--space-8)" />
        <UiSkeleton width="min(50%, 260px)" height="var(--space-4)" />
      </div>
      <section class="home__section" aria-hidden="true">
        <UiSkeleton width="160px" height="var(--space-6)" />
        <div class="home__skeleton-tile">
          <UiSkeleton width="40%" height="var(--space-3)" />
          <UiSkeleton width="80%" height="var(--space-6)" />
          <UiSkeleton width="60%" height="var(--space-3)" />
          <UiSkeleton class="home__skeleton-foot" width="100%" height="var(--control-md)" radius="var(--radius-full)" />
        </div>
      </section>
      <section class="home__section" aria-hidden="true">
        <UiSkeleton width="96px" height="var(--space-6)" />
        <div class="home__reports">
          <div v-for="card in 4" :key="card" class="home__skeleton-card">
            <UiSkeleton width="var(--avatar-sm)" height="var(--avatar-sm)" radius="var(--radius-full)" />
            <UiSkeleton width="70%" height="var(--space-4)" />
            <UiSkeleton width="50%" height="var(--space-3)" />
            <UiSkeleton class="home__skeleton-foot" height="var(--space-6)" />
          </div>
        </div>
      </section>
    </div>

    <div v-else-if="newcomer" class="page"><HomeFirstRun /></div>

    <div v-else class="page">
      <header class="home__hello">
        <h1 class="t-h1">{{ greeting }}</h1>
        <p class="home__lede">{{ t('home.greeting.lede') }}</p>
      </header>

      <UiPageSection v-if="events.length" :title="t('home.highlights')">
        <HomeEvents :events="events" />
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
          <ReportCard v-for="chat in reports" :key="chat.id" :report="chat.report!" :has-avatar="chat.hasAvatar" />
        </div>
      </UiPageSection>

      <HomeUnanalysed />
    </div>
  </UiPageContainer>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--page-gap);
}

/* Phones keep the floating «Новый анализ» clear of the last row. */
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

.home__lede {
  color: var(--text-muted);
  font: var(--text-small);
}

@media (min-width: 901px) {
  .home__lede {
    font: var(--text-body);
  }
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

.home__skeleton-tile,
.home__skeleton-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--card-padding);
  border-radius: var(--radius-lg);
  background: var(--surface);
}

.home__skeleton-tile {
  min-height: 176px;
}

.home__skeleton-card {
  gap: var(--space-2);
  min-height: 148px;
}

@media (min-width: 901px) {
  .home__skeleton-card {
    min-height: 188px;
  }
}

.home__skeleton-foot {
  margin-top: auto;
}
</style>

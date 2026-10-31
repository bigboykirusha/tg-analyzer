<script setup lang="ts">
import { BarChart2, Lock, MessageSquare, Plus } from '../lib/icons'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

/** Report cards shown before «All reports». */
const REPORTS_PREVIEW = 8

const { t } = useI18n()
useSeoMeta({ title: () => t('dashboard.title') })

const workspace = useWorkspaceStore()
const analysis = useAnalysis()
const toast = useToast()
const errorMessage = useErrorMessage()

const showAllReports = ref(false)

/** Finished reports, newest first: what the user has already learned. */
const reports = computed(() =>
  workspace.chats
    .filter((chat) => chat.report)
    .sort((left, right) => Date.parse(right.report!.analyzedAt) - Date.parse(left.report!.analyzedAt)),
)
const shownReports = computed(() => (showAllReports.value ? reports.value : reports.value.slice(0, REPORTS_PREVIEW)))
/** At least two private reports: compare the people side by side. */
const privateReports = computed(() =>
  reports.value.filter((chat) => chat.type === 'private' && chat.report?.headline).map((chat) => chat.report!),
)
const avatars = computed(() => new Map(workspace.chats.map((chat) => [chat.id, chat.hasAvatar])))
const reportIds = computed(() => new Set(reports.value.map((chat) => chat.id)))

/** Returning users wait for their reports instead of seeing the newcomer screen flash by. */
const loadingReports = computed(
  () => !reports.value.length && workspace.reportsState !== 'ready' && workspace.reportsState !== 'error',
)
/** Newcomers pick their first chat right here; everyone else gets the summary. */
const newcomer = computed(() => !reports.value.length && !loadingReports.value)

const steps = computed(() => [
  { icon: MessageSquare, title: t('dashboard.intro.step1Title'), text: t('dashboard.intro.step1Text') },
  { icon: Lock, title: t('dashboard.intro.step2Title'), text: t('dashboard.intro.step2Text') },
  { icon: BarChart2, title: t('dashboard.intro.step3Title'), text: t('dashboard.intro.step3Text') },
])

const queuedJobs = computed(() => new Set(analysis.queued.value.map((item) => item.chatId)))
function isUpdating(chatId: string) {
  return (analysis.isActive.value && analysis.progress.value.chatId === chatId) || queuedJobs.value.has(chatId)
}

onMounted(() => {
  void workspace.loadDialogs()
  void workspace.loadRecent()
  void workspace.loadReports().catch((error) => toast.error(t('dashboard.reportsError'), errorMessage(error)))
})
</script>

<template>
  <UiPageContainer>
    <div class="page">
      <SessionBanner />

      <!-- Loading: the shape of the summary and the report cards, so nothing jumps when they arrive. -->
      <template v-if="loadingReports">
        <div class="bento" aria-hidden="true">
          <div class="tile span-8 home__skeleton">
            <UiSkeleton width="40%" /><UiSkeleton width="45%" height="44px" />
            <UiSkeleton class="home__skeleton-foot" height="72px" />
          </div>
          <div class="tile span-4 home__skeleton">
            <UiSkeleton width="60%" />
            <UiSkeleton class="home__skeleton-foot" width="64px" height="64px" radius="50%" />
            <UiSkeleton width="50%" height="28px" />
          </div>
        </div>
        <div class="stack" aria-hidden="true">
          <UiSkeleton width="120px" height="24px" />
          <div class="report-cards">
            <div v-for="card in 4" :key="card" class="tile home__skeleton-card">
              <UiSkeleton width="44px" height="44px" radius="50%" />
              <UiSkeleton width="70%" height="20px" />
              <UiSkeleton width="50%" />
              <UiSkeleton class="home__skeleton-foot" height="40px" />
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="newcomer">
        <UiPageBar :title="t('home.onboardTitle')" :lede="t('home.onboardText')" />

        <AnalysisBanner />

        <ol class="tile tile--lime onboard">
          <li v-for="(step, index) in steps" :key="index" class="onboard__step">
            <span class="onboard__num">{{ index + 1 }}</span>
            <span class="onboard__copy">
              <strong>{{ step.title }}</strong>
              <span>{{ step.text }}</span>
            </span>
          </li>
        </ol>

        <MonthSummary v-if="workspace.recent?.chats.length" :recent="workspace.recent" :report-ids="reportIds" />

        <UiPageSection id="chats" :title="t('dashboard.chatsTitle')">
          <ChatPicker />
        </UiPageSection>
      </template>

      <template v-else>
        <UiPageBar :title="t('home.title')">
          <template #actions>
            <UiButton class="home__new" to="/new" size="sm" :icon="Plus">{{ t('nav.newAnalysis') }}</UiButton>
          </template>
        </UiPageBar>
        <AnalysisBanner />

        <MonthSummary v-if="workspace.recent" :recent="workspace.recent" :report-ids="reportIds" />
        <div v-else-if="workspace.recentState !== 'error'" class="bento" aria-hidden="true">
          <div class="tile span-8 home__skeleton">
            <UiSkeleton width="40%" /><UiSkeleton width="45%" height="44px" />
            <UiSkeleton class="home__skeleton-foot" height="72px" />
          </div>
          <div class="tile span-4 home__skeleton">
            <UiSkeleton width="60%" />
            <UiSkeleton class="home__skeleton-foot" width="64px" height="64px" radius="50%" />
            <UiSkeleton width="50%" height="28px" />
          </div>
        </div>

        <UiPageSection id="reports" :title="t('dashboard.reportsTitle')">
          <template v-if="reports.length > REPORTS_PREVIEW" #actions>
            <UiButton variant="ghost" size="sm" @click="showAllReports = !showAllReports">
              {{
                showAllReports
                  ? t('dashboard.showFewerReports')
                  : t('dashboard.showAllReports', { count: reports.length })
              }}
            </UiButton>
          </template>
          <div class="report-cards">
            <ReportCard
              v-for="chat in shownReports"
              :key="chat.id"
              :report="chat.report!"
              :has-avatar="chat.hasAvatar"
              :updating="isUpdating(chat.id)"
            />
          </div>
        </UiPageSection>

        <UiPageSection
          v-if="privateReports.length >= 2"
          id="people"
          :title="t('people.title')"
          :hint="t('people.hint')"
        >
          <div class="tile"><PeopleTable :reports="privateReports" :avatars="avatars" /></div>
        </UiPageSection>
      </template>
    </div>
  </UiPageContainer>
</template>

<style scoped>
/* Wide screens start a new analysis from the sidebar. */
@media (min-width: 901px) {
  .home__new {
    display: none;
  }
}

.home__skeleton {
  min-height: 240px;
}

.home__skeleton-card {
  min-height: 200px;
}

.home__skeleton-foot {
  margin-top: auto;
}

@media (max-width: 900px) {
  .home__skeleton {
    min-height: 160px;
  }
}

/* ─── Newcomer: three steps in one lime tile ─── */
.onboard {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-6);
  margin: 0;
  padding: var(--space-6);
  list-style: none;
}

.onboard__step {
  display: flex;
  gap: var(--space-3);
}

.onboard__num {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  background: var(--tile-ink);
  color: var(--on-tile-ink);
  font: 600 13px/1 var(--font-sans);
}

.onboard__copy {
  display: grid;
  gap: 2px;
  color: var(--text-muted);
  font: var(--text-small);
}

.onboard__copy strong {
  color: var(--text);
  font: var(--text-ui);
  font-weight: 600;
}

@media (max-width: 900px) {
  .onboard {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-4);
    padding: var(--space-5);
  }
}

/* ─── Reports ─── */
/* As many cards per row as fit, so a few reports never leave one orphan below. */
.report-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-3);
}

@media (max-width: 640px) {
  /* Phones: report cards scroll sideways instead of pushing the page down. */
  .report-cards {
    display: flex;
    margin-inline: calc(var(--page-gutter) * -1);
    padding: 2px var(--page-gutter) var(--space-2);
    overflow-x: auto;
    scroll-padding-inline: var(--page-gutter);
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
  }

  .report-cards::-webkit-scrollbar {
    display: none;
  }

  .report-cards > * {
    flex: 0 0 min(260px, 75%);
    scroll-snap-align: start;
  }
}
</style>

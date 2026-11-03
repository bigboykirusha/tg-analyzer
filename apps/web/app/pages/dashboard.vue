<script setup lang="ts">
import { BarChart2, Lock, MessageSquare, Plus } from '../lib/icons'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })


const { t } = useI18n()
useSeoMeta({ title: () => t('dashboard.title') })

const workspace = useWorkspaceStore()
const analysis = useAnalysis()
const toast = useToast()
const errorMessage = useErrorMessage()


/** Finished reports, newest first: what the user has already learned. */
const reports = computed(() =>
  workspace.chats
    .filter((chat) => chat.report)
    .sort((left, right) => Date.parse(right.report!.analyzedAt) - Date.parse(left.report!.analyzedAt)),
)
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
      <!-- Loading: the shape of the summary and the report cards, so nothing jumps when they arrive. -->
      <template v-if="loadingReports">
        <MonthSkeleton />
        <div class="stack" aria-hidden="true">
          <UiSkeleton width="120px" height="24px" />
          <div class="report-cards">
            <div v-for="card in 4" :key="card" class="tile home__skeleton-card">
              <div class="home__skeleton-head">
              <UiSkeleton width="44px" height="44px" radius="50%" />
                <div class="home__skeleton-copy">
                  <UiSkeleton width="70%" height="20px" />
                  <UiSkeleton width="50%" />
                </div>
              </div>
              <UiSkeleton class="home__skeleton-foot" height="40px" />
            </div>
          </div>
        </div>
      </template>

      <template v-else-if="newcomer">
        <UiPageBar :title="t('home.onboardTitle')" />

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

        <UiPageSection id="chats" :title="t('dashboard.chatsTitle')">
          <ChatPicker />
        </UiPageSection>
      </template>

      <template v-else>
        <UiPageBar :title="t('home.title')" untitled>
          <template #actions>
            <UiButton class="home__new" variant="primary" to="/new" size="sm" :icon="Plus">{{
              t('nav.newAnalysis')
            }}</UiButton>
          </template>
        </UiPageBar>
        <AnalysisBanner />

        <MonthSummary v-if="workspace.recent" :recent="workspace.recent" :report-ids="reportIds" />
        <MonthSkeleton v-else-if="workspace.recentState !== 'error'" />

        <UiPageSection id="reports" :title="t('dashboard.reportsTitle')">
          <div class="report-cards">
            <ReportCard
              v-for="chat in reports"
              :key="chat.id"
              :report="chat.report!"
              :has-avatar="chat.hasAvatar"
              :updating="isUpdating(chat.id)"
            />
          </div>
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

.home__skeleton-card {
  min-height: 200px;
}

.home__skeleton-head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.home__skeleton-copy {
  display: grid;
  flex: 1;
  min-width: 0;
  gap: var(--space-2);
}

.home__skeleton-foot {
  margin-top: auto;
}

@media (max-width: 640px) {
  .home__skeleton-card {
    min-height: 72px;
    justify-content: center;
    padding: var(--space-3) 0;
    border-radius: 0;
    background: transparent;
  }

  .home__skeleton-card + .home__skeleton-card {
    border-top: 1px solid var(--border);
  }

  .home__skeleton-foot {
    display: none;
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
  font: var(--text-label);
  font-weight: 600;
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

/* Phones: one card per row — a list you scroll down, not a carousel that hides the rest. */
/* Phones: one white card holding the reports as rows. */
@media (max-width: 640px) {
  .report-cards {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
    padding: var(--space-1) var(--space-4);
    border-radius: var(--radius-lg);
    background: var(--surface);
  }
}
</style>

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
  void workspace.loadReports().catch((error) => toast.error(t('dashboard.reportsError'), errorMessage(error)))
})
</script>

<template>
  <UiPageContainer>
    <div class="page">
      <SessionBanner />

      <!-- Loading: the shape of the summary, so nothing jumps when it arrives. -->
      <template v-if="loadingReports">
        <UiSkeleton width="220px" height="40px" />
        <div class="bento" aria-hidden="true">
          <div class="tile span-8 home__skeleton">
            <UiSkeleton width="40%" /><UiSkeleton width="60%" height="44px" />
          </div>
          <div class="tile span-4 home__skeleton"><UiSkeleton width="50%" /></div>
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

        <UiPageSection id="chats" :title="t('dashboard.chatsTitle')">
          <ChatPicker />
        </UiPageSection>
      </template>

      <template v-else>
        <UiPageBar :title="t('home.title')" />
        <AnalysisBanner />

        <CircleSummary :reports="workspace.reports" :avatars="avatars" />

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
            <NuxtLink to="/new" class="new-card">
              <span class="new-card__icon" aria-hidden="true"><Plus /></span>
              <span class="new-card__title">{{ t('home.newCard') }}</span>
              <span class="new-card__text">{{ t('home.newCardText') }}</span>
            </NuxtLink>
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
.home__skeleton {
  min-height: 220px;
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

/* The first card starts a new analysis: dashed, so it never reads as a report. */
.new-card {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: var(--space-1);
  min-height: 200px;
  padding: var(--space-5);
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--radius-card);
  color: var(--text);
  transition:
    background-color var(--transition-fast),
    transform var(--duration-press) var(--ease-standard);
}

.new-card:active {
  transform: scale(var(--press-scale));
}

@media (hover: hover) {
  .new-card:hover {
    background: var(--surface);
  }
}

.new-card__icon {
  display: inline-grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-bottom: auto;
  border-radius: var(--radius-full);
  background: var(--lime);
  color: var(--on-lime);
}

.new-card__title {
  font: 600 18px/24px var(--font-sans);
  letter-spacing: -0.015em;
}

.new-card__text {
  color: var(--text-muted);
  font: var(--text-small);
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

  .new-card {
    flex-basis: 150px;
    min-height: 0;
  }
}
</style>

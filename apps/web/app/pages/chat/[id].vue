<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { AlertCircle } from '../../lib/icons'
import { ApiClientError } from '../../composables/useApi'
import type { StoryIntent } from '../../components/report/ShareDialog.vue'
import { hueOf } from '../../lib/hue'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

const route = useRoute()
const { t, tc } = useI18n()
const workspace = useWorkspaceStore()
const analysis = useAnalysis()
const errorMessage = useErrorMessage()

const chatId = computed(() => String(route.params.id))
const data = ref<ReportDto | null>(workspace.openedReports[chatId.value] ?? null)
const loadError = ref<unknown>(null)
const notFound = ref(false)
const shareOpen = ref(false)
const storyOpen = ref(false)
const storyIntent = ref<StoryIntent>('view')
/** The chat's name from the lists already loaded, so the top bar is right before the report arrives. */
const knownTitle = computed(
  () =>
    workspace.reports.find((report) => report.chatId === chatId.value)?.title ??
    workspace.chats.find((chat) => chat.id === chatId.value)?.title ??
    null,
)
useSeoMeta({ title: () => data.value?.summary.title ?? t('report.title') })
// The page takes the person's colour: poster, room, their marks in charts and the toolbar over the poster.
useHead({ htmlAttrs: { 'data-hue': () => hueOf(chatId.value) } })

async function load() {
  loadError.value = null
  try {
    data.value = await workspace.loadReport(chatId.value)
    notFound.value = false
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) {
      notFound.value = true
      // A chat without a report can be analysed right here, once the list says it exists.
      if (workspace.dialogsState === 'idle') void workspace.loadDialogs()
    } else loadError.value = error
  }
}

// Reload the report as soon as a fresh analysis of this chat completes.
watch(analysis.finished, (job) => {
  if (job?.chatId === chatId.value && job.status === 'completed') void load()
})

watch(chatId, () => {
  data.value = workspace.openedReports[chatId.value] ?? null
  void load()
})

/** The chapters and their answers for the header's capsule; the report itself reads the same composable. */
const headlines = useChapterHeadlines(() => data.value!)

/** A known chat without a report is not a dead end: it can be analysed right here. */
const knownChat = computed(() => workspace.chats.find((chat) => chat.id === chatId.value) ?? null)
const starting = ref(false)
async function analyseHere() {
  starting.value = true
  try {
    await analysis.startAnalysis(chatId.value, knownChat.value?.title ?? null)
  } catch (error) {
    loadError.value = error
  } finally {
    starting.value = false
  }
}

const shareUsed = ref(false)
const storyUsed = ref(false)
function openShare() {
  shareUsed.value = true
  shareOpen.value = true
}

/** «Поделиться» on a report card of the home page opens this page with the sheet already up. */
onMounted(() => {
  if (route.query.share === undefined) return
  void navigateTo({ query: { ...route.query, share: undefined } }, { replace: true })
  openShare()
})

/** «Вся глава» from a story slide: the story closes and the report opens at that chapter. */
function openChapter(id: string) {
  storyOpen.value = false
  setTimeout(() => {
    history.replaceState(history.state, '', `#part-${id}`)
    document.getElementById(`part-${id}`)?.scrollIntoView({ block: 'start' })
  }, 0)
}

function openStory(intent: StoryIntent) {
  storyIntent.value = intent
  storyUsed.value = true
  storyOpen.value = true
}

onMounted(load)
</script>

<template>
  <div>
    <ReportPoster
      v-if="data || (!notFound && !loadError)"
      :data="data"
      :title="knownTitle"
      actions
      @story="openStory('view')"
      @share="openShare"
    />
    <UiPageContainer>
      <div v-if="data" class="page report-page">
        <ReportHeader
          :summary="data.summary"
          :headlines="headlines"
          :meta="tc('common.messagesCount', data.report.totals.messages)"
          @share="openShare"
        />

        <!-- Charts (ECharts) belong to groups only, and the share sheet and stories load on first use:
             a private report on a phone downloads neither. -->
        <ReportSince :data="data" />
        <LazyGroupReport v-if="data.summary.type === 'group'" :data="data" />
        <PrivateReport v-else :data="data" />

        <LazyShareDialog
          v-if="shareUsed"
          :open="shareOpen"
          :data="data"
          @close="shareOpen = false"
          @story="openStory"
        />
        <LazyReportStory
          v-if="storyUsed"
          :open="storyOpen"
          :data="data"
          :intent="storyIntent"
          @close="storyOpen = false"
          @chapter="openChapter"
        />
      </div>

      <UiPageBar v-else-if="notFound || loadError" :title="knownTitle ?? t('nav.back')" back="/dashboard" />

      <UiEmptyState
        v-if="!data && notFound"
        :icon="AlertCircle"
        :title="t('report.notFoundTitle')"
        :description="knownChat ? t('report.notFoundKnownText') : t('report.notFoundText')"
      >
        <template #action>
          <UiButton
            v-if="knownChat"
            variant="primary"
            :loading="starting || analysis.isActive.value"
            @click="analyseHere"
          >
            {{ t('report.analyseHere') }}
          </UiButton>
          <UiButton v-else variant="primary" to="/new">{{ t('common.goToChats') }}</UiButton>
        </template>
      </UiEmptyState>

      <UiEmptyState
        v-else-if="!data && loadError"
        tone="danger"
        :icon="AlertCircle"
        :title="t('report.loadError')"
        :description="errorMessage(loadError)"
      >
        <template #action>
          <UiButton variant="secondary" @click="load">{{ t('common.retry') }}</UiButton>
        </template>
      </UiEmptyState>

      <ReportSkeleton v-if="!data && !notFound && !loadError" :title="knownTitle" />
    </UiPageContainer>
    <!-- The report ends as it began: on the person's poster, with «Итоги» and sharing. -->
    <ReportEnding
      v-if="data"
      :data="data"
      @story="openStory('view')"
      @share="openShare"
    />
  </div>
</template>

<style scoped>
/* Under the poster: the news strip, then the first chapter, each a step below the last. */
.report-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding-top: var(--space-4);
}

.report-page :deep(.report-part:first-child) {
  padding-top: 0;
}

@media (min-width: 901px) {
  .report-page {
    padding-top: var(--space-6);
  }
}
</style>

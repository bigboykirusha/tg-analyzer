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
    if (error instanceof ApiClientError && error.status === 404) notFound.value = true
    else loadError.value = error
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

/** «Кого разобрать следующим»: the busiest chat of the month that has no report yet (not this one). */
const nextChat = computed(() => {
  const withReport = new Set(workspace.reports.map((report) => report.chatId))
  const chat = workspace.recent?.chats.find((item) => item.id !== chatId.value && !withReport.has(item.id))
  return chat ? { chatId: chat.id, title: chat.title, messages: chat.messages } : null
})
const nextStarting = ref(false)
const nextBusy = computed(
  () =>
    nextStarting.value ||
    analysis.progress.value.chatId === nextChat.value?.chatId ||
    analysis.queued.value.some((job) => job.chatId === nextChat.value?.chatId),
)
async function analyseNext(id: string) {
  nextStarting.value = true
  try {
    await analysis.startAnalysis(id, nextChat.value?.title ?? null)
  } finally {
    nextStarting.value = false
  }
}
onMounted(() => {
  if (!workspace.recent) void workspace.loadRecent()
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
      story
      @story="openStory('view')"
    />
    <UiPageContainer>
      <div v-if="data" class="page report-page">
        <ReportHeader
          :summary="data.summary"
          :headlines="headlines"
          :meta="tc('common.messagesCount', data.report.totals.messages)"
          :can-reanalyse="Boolean(knownChat)"
          @share="openShare"
          @story="openStory('view')"
          @reanalyse="analyseHere"
        />

        <!-- Charts (ECharts) belong to groups only, and the share sheet and stories load on first use:
             a private report on a phone downloads neither. -->
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
      :next="nextChat"
      :next-busy="nextBusy"
      @story="openStory('view')"
      @share="openShare"
      @analyse="analyseNext"
    />
  </div>
</template>

<style scoped>
/* Under the poster the report starts at the page's own rhythm. */
.report-page {
  padding-top: var(--page-top);
}
</style>

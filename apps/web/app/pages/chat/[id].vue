<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { AlertCircle } from '../../lib/icons'
import { ApiClientError } from '../../composables/useApi'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

const route = useRoute()
const { t } = useI18n()
const auth = useAuthStore()
const workspace = useWorkspaceStore()
const analysis = useAnalysis()
const toast = useToast()
const errorMessage = useErrorMessage()

const chatId = computed(() => String(route.params.id))
const data = ref<ReportDto | null>(workspace.openedReports[chatId.value] ?? null)
const loadError = ref<unknown>(null)
const notFound = ref(false)
const reanalysing = ref(false)
const storyOpen = ref(false)

/** The chat's name from the lists already loaded, so the top bar is right before the report arrives. */
const knownTitle = computed(
  () =>
    workspace.reports.find((report) => report.chatId === chatId.value)?.title ??
    workspace.chats.find((chat) => chat.id === chatId.value)?.title ??
    null,
)
useSeoMeta({ title: () => data.value?.summary.title ?? t('report.title') })

const canReanalyse = computed(() => auth.telegramSessionActive && !analysis.isActive.value && !reanalysing.value)

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

async function reanalyse() {
  reanalysing.value = true
  try {
    await analysis.startAnalysis(chatId.value, data.value?.summary.title ?? null)
  } catch (error) {
    toast.error(t('analysis.startError'), errorMessage(error))
  } finally {
    reanalysing.value = false
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

onMounted(load)
</script>

<template>
  <UiPageContainer>
    <div v-if="data" class="page">
      <ReportHeader
        :summary="data.summary"
        :can-reanalyse="canReanalyse"
        :reanalysing="reanalysing"
        @reanalyse="reanalyse"
        @story="storyOpen = true"
      />

      <GroupReport v-if="data.summary.type === 'group'" :data="data" />
      <PrivateReport v-else :data="data" />
      <ReportStory :open="storyOpen" :data="data" @close="storyOpen = false" />
    </div>

    <UiPageBar v-else-if="notFound || loadError" :title="knownTitle ?? t('nav.back')" back="/dashboard" />

    <UiEmptyState
      v-if="!data && notFound"
      :icon="AlertCircle"
      :title="t('report.notFoundTitle')"
      :description="t('report.notFoundText')"
    >
      <template #action>
        <UiButton variant="primary" to="/new">{{ t('common.goToChats') }}</UiButton>
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
</template>

<style scoped>
/* The one destructive action, out of the way at the end of the report. */
</style>

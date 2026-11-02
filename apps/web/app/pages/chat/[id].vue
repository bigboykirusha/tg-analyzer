<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { AlertCircle, RotateCw } from '../../lib/icons'
import { ApiClientError } from '../../composables/useApi'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

const route = useRoute()
const { t, formatRelative } = useI18n()
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
/** Opened from «Share»: the sheet with the ways to send the pictures is already up. */
const storyShare = ref(false)

function openStory(share: boolean) {
  storyShare.value = share
  storyOpen.value = true
}

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
        @story="openStory(false)"
        @share="openStory(true)"
      />

      <GroupReport v-if="data.summary.type === 'group'" :data="data" />
      <PrivateReport v-else :data="data" />

      <!-- Phones: the bar has no refresh button, it sits under the report with the date of the data. -->
      <div class="report-foot no-print">
        <span class="report-foot__date">{{
          t('report.updatedAt', { when: formatRelative(data.summary.analyzedAt) })
        }}</span>
        <UiButton
          variant="ghost"
          size="sm"
          :icon="RotateCw"
          :loading="reanalysing"
          :disabled="!canReanalyse"
          @click="reanalyse"
        >
          {{ t('report.reanalyse') }}
        </UiButton>
      </div>
      <ReportStory :open="storyOpen" :share-first="storyShare" :data="data" @close="storyOpen = false" />
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
.report-foot {
  display: none;
}

/* Phones: the date of the data and the refresh, quietly under the report. */
@media (max-width: 640px) {
  .report-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    color: var(--text-muted);
    font: var(--text-small);
  }
}
</style>

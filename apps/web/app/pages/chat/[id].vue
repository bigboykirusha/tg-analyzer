<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import { AlertCircle, Trash2 } from '../../lib/icons'
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
const confirm = ref<'delete' | null>(null)
const deleting = ref(false)
const storyOpen = ref(false)

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

async function deleteReport() {
  deleting.value = true
  try {
    await workspace.deleteReport(chatId.value)
    toast.success(t('report.deleted'))
    await navigateTo('/dashboard')
  } catch (error) {
    toast.error(t('report.deleteError'), errorMessage(error))
  } finally {
    deleting.value = false
    confirm.value = null
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
      <div class="report-foot no-print">
        <UiButton variant="danger-soft" size="sm" :icon="Trash2" @click="confirm = 'delete'">
          {{ t('report.deleteMenu') }}
        </UiButton>
      </div>
      <ReportStory :open="storyOpen" :data="data" @close="storyOpen = false" />
    </div>

    <UiEmptyState
      v-else-if="notFound"
      :icon="AlertCircle"
      :title="t('report.notFoundTitle')"
      :description="t('report.notFoundText')"
    >
      <template #action>
        <UiButton variant="primary" to="/new">{{ t('common.goToChats') }}</UiButton>
      </template>
    </UiEmptyState>

    <UiEmptyState
      v-else-if="loadError"
      :icon="AlertCircle"
      :title="t('report.loadError')"
      :description="errorMessage(loadError)"
    >
      <template #action>
        <UiButton variant="secondary" @click="load">{{ t('common.retry') }}</UiButton>
      </template>
    </UiEmptyState>

    <ReportSkeleton v-else />

    <DeleteReportDialog
      :open="confirm === 'delete'"
      :report="data?.summary ?? null"
      :loading="deleting"
      @close="confirm = null"
      @confirm="deleteReport"
    />
  </UiPageContainer>
</template>

<style scoped>
/* The one destructive action, out of the way at the end of the report. */
.report-foot {
  display: flex;
  justify-content: center;
  padding-top: var(--space-4);
}
</style>

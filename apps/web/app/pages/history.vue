<script setup lang="ts">
import type { JobStatus, Page, ParseJobDto } from '@tg-analyzer/shared'
import { Clock, Trash2 } from '../lib/icons'
import { api } from '../composables/useApi'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

const PAGE_SIZE = 20

const { t, tc, formatDate, formatDuration } = useI18n()
useSeoMeta({ title: () => t('nav.history') })

const analysis = useAnalysis()
const workspace = useWorkspaceStore()
const toast = useToast()
const errorMessage = useErrorMessage()

const page = ref(1)
const history = ref<Page<ParseJobDto> | null>(null)
const loading = ref(false)
const failed = ref(false)
const deletingJobId = ref<string | null>(null)
const confirmClearOpen = ref(false)
const clearing = ref(false)

const pageCount = computed(() => Math.max(1, Math.ceil((history.value?.total ?? 0) / PAGE_SIZE)))
const reportIds = computed(() => new Set(workspace.reports.map((report) => report.chatId)))
const hasFinishedJobs = computed(() => history.value?.items.some((job) => !isActive(job.status)) ?? false)

function isActive(status: JobStatus) {
  return status === 'pending' || status === 'running'
}

async function load(nextPage = page.value) {
  loading.value = true
  try {
    history.value = await api('GET /api/v1/parse/history', { query: { page: nextPage, limit: PAGE_SIZE } })
    page.value = nextPage
    failed.value = false
    // A deletion can leave the current page empty.
    if (!history.value.items.length && nextPage > 1) await load(nextPage - 1)
  } catch (error) {
    failed.value = !history.value
    toast.error(t('history.loadError'), errorMessage(error))
  } finally {
    loading.value = false
  }
}

async function remove(jobId: string) {
  deletingJobId.value = jobId
  try {
    await api('DELETE /api/v1/parse/history/:jobId', { params: { jobId } })
    await load()
  } catch (error) {
    toast.error(t('history.deleteError'), errorMessage(error))
  } finally {
    deletingJobId.value = null
  }
}

async function clearAll() {
  clearing.value = true
  try {
    await api('DELETE /api/v1/parse/history')
    await load(1)
    confirmClearOpen.value = false
  } catch (error) {
    toast.error(t('history.deleteError'), errorMessage(error))
  } finally {
    clearing.value = false
  }
}

function duration(job: ParseJobDto) {
  if (!job.startedAt || !job.completedAt) return null
  return formatDuration((Date.parse(job.completedAt) - Date.parse(job.startedAt)) / 1000)
}

function meta(job: ParseJobDto) {
  const parts = [formatDate(job.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })]
  if (job.status === 'completed') parts.push(tc('common.messagesCount', job.totalMessages))
  const took = duration(job)
  if (took && job.status === 'completed') parts.push(took)
  return parts.join(' · ')
}

watch(analysis.finished, () => void load())

onMounted(() => {
  void load(1)
  if (workspace.reportsState === 'idle') void workspace.loadReports().catch(() => undefined)
})
</script>

<template>
  <UiPageContainer>
    <div class="stack stack--lg">
      <header class="history-header">
        <div class="section-copy">
          <h1 class="t-h1">{{ t('history.title') }}</h1>
          <p class="t-body">{{ t('history.subtitle') }}</p>
        </div>
        <UiButton v-if="hasFinishedJobs" variant="ghost" size="sm" :icon="Trash2" @click="confirmClearOpen = true">
          {{ t('history.clearMenu') }}
        </UiButton>
      </header>

      <section class="card history-card" :aria-busy="loading">
        <UiListSkeleton v-if="!history && !failed" :rows="5" :avatar="false" />

        <UiEmptyState v-else-if="failed" :icon="Clock" :title="t('history.loadError')">
          <template #action>
            <UiButton variant="secondary" @click="load()">{{ t('common.retry') }}</UiButton>
          </template>
        </UiEmptyState>

        <UiEmptyState
          v-else-if="!history?.items.length"
          :icon="Clock"
          :title="t('history.emptyTitle')"
          :description="t('history.emptyText')"
        >
          <template #action>
            <UiButton variant="primary" to="/dashboard">{{ t('history.goToChats') }}</UiButton>
          </template>
        </UiEmptyState>

        <ul v-else class="job-list">
          <li v-for="job in history.items" :key="job.jobId" class="job">
            <div class="job__copy">
              <div class="job__title-row">
                <span class="job__title">{{ job.chatTitle || (job.chatId ? job.chatId : t('history.allChats')) }}</span>
                <span class="job__status" :class="`job__status--${job.status}`">{{ t(`status.${job.status}`) }}</span>
              </div>
              <span class="t-small t-muted">{{ meta(job) }}</span>
              <span v-if="job.error" class="t-small job__error">{{ t(`analysis.error.${job.error}`) }}</span>
            </div>
            <div class="job__actions">
              <UiButton
                v-if="job.status === 'completed' && job.chatId && reportIds.has(job.chatId)"
                :to="`/chat/${job.chatId}`"
                variant="secondary"
                size="sm"
              >
                {{ t('dashboard.openReport') }}
              </UiButton>
              <UiIconButton
                v-if="!isActive(job.status)"
                :icon="Trash2"
                :label="t('history.delete')"
                size="sm"
                :loading="deletingJobId === job.jobId"
                @click="remove(job.jobId)"
              />
            </div>
          </li>
        </ul>

        <nav v-if="pageCount > 1" class="pagination" :aria-label="t('history.pagination')">
          <UiButton variant="secondary" size="sm" :disabled="loading || page <= 1" @click="load(page - 1)">
            {{ t('common.previous') }}
          </UiButton>
          <span class="t-small t-muted">{{ t('common.pageOf', { page, total: pageCount }) }}</span>
          <UiButton variant="secondary" size="sm" :disabled="loading || page >= pageCount" @click="load(page + 1)">
            {{ t('common.next') }}
          </UiButton>
        </nav>
      </section>
    </div>

    <UiConfirmDialog
      :open="confirmClearOpen"
      :title="t('history.clearTitle')"
      :description="t('history.clearConfirm')"
      :confirm-label="t('history.clear')"
      variant="danger"
      :loading="clearing"
      @close="confirmClearOpen = false"
      @confirm="clearAll"
    />
  </UiPageContainer>
</template>

<style scoped>
.history-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-4);
  padding-inline: var(--space-1);
}

.history-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.job-list {
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface);
  list-style: none;
}

.job {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-height: 72px;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border);
}

.job:last-child {
  border-bottom: 0;
}

.job__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.job__title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.job__title {
  overflow: hidden;
  font-size: 15px;
  font-weight: 500;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.job__status {
  flex-shrink: 0;
  color: var(--text-muted);
  font: var(--text-small);
}

.job__status--failed {
  color: var(--danger);
}

.job__error {
  color: var(--danger);
}

.job__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--space-2);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
}

@media (max-width: 640px) {
  .history-header {
    align-items: flex-start;
    flex-direction: column;
    padding-inline: var(--space-2);
  }

  .job {
    align-items: flex-start;
    flex-direction: column;
    padding: var(--space-3);
  }
}
</style>

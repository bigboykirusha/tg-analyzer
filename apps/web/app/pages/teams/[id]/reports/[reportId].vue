<script setup lang="ts">
import type { TeamReportDto } from '@tg-analyzer/shared'
import { AlertCircle, ArrowLeft, Info } from '../../../../lib/icons'
import { ApiClientError } from '../../../../composables/useApi'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

/**
 * A colleague's report, read inside the team. It is the same report its
 * author sees, so «you» in it means the author; nothing here can change it.
 */
const route = useRoute()
const { t, formatRelative } = useI18n()
const errorMessage = useErrorMessage()

const teamId = computed(() => String(route.params.id))
const reportId = computed(() => String(route.params.reportId))
const data = ref<TeamReportDto | null>(null)
const notFound = ref(false)
const loadError = ref<unknown>(null)
const storyOpen = ref(false)

useSeoMeta({ title: () => data.value?.summary.title ?? t('report.title') })

const author = computed(() => {
  const shared = data.value?.shared
  if (!shared) return ''
  return shared.mine ? t('team.you') : shared.sharedBy.name || t('team.someone')
})

async function load() {
  loadError.value = null
  try {
    data.value = await api('GET /api/v1/teams/:teamId/reports/:reportId', {
      params: { teamId: teamId.value, reportId: reportId.value },
    })
    notFound.value = false
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) notFound.value = true
    else loadError.value = error
  }
}

watch([teamId, reportId], load)
onMounted(load)
</script>

<template>
  <UiPageContainer>
    <div v-if="data" class="page">
      <NuxtLink :to="`/teams/${teamId}`" class="back">
        <ArrowLeft aria-hidden="true" />{{ t('team.backToTeam') }}
      </NuxtLink>
      <ReportHeader :summary="data.summary" demo @story="storyOpen = true" />

      <p class="tile shared-note" role="note">
        <Info aria-hidden="true" />
        <span>
          {{ t('team.sharedNote', { name: author, time: formatRelative(data.summary.analyzedAt) }) }}
          <template v-if="data.summary.type !== 'group' && !data.shared.mine">
            {{ t('team.sharedNoteYou', { name: author }) }}
          </template>
        </span>
      </p>

      <GroupReport v-if="data.summary.type === 'group'" :data="data" />
      <PrivateReport v-else :data="data" />
      <ReportStory :open="storyOpen" :data="data" offline @close="storyOpen = false" />
    </div>

    <UiEmptyState
      v-else-if="notFound"
      :icon="AlertCircle"
      :title="t('report.notFoundTitle')"
      :description="t('team.reportGone')"
    >
      <template #action>
        <UiButton variant="primary" :to="`/teams/${teamId}`">{{ t('team.backToTeam') }}</UiButton>
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
  </UiPageContainer>
</template>

<style scoped>
.back {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: var(--space-2);
  margin-bottom: calc(var(--space-2) - var(--page-gap));
  color: var(--text-muted);
  font: var(--text-ui);
}

@media (hover: hover) {
  .back:hover {
    color: var(--text);
  }
}

.shared-note {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  color: var(--text-muted);
  font: var(--text-small);
}

.shared-note svg {
  flex: none;
  margin-top: 1px;
  color: var(--text);
  --icon-size: var(--icon-sm);
}
</style>

<script setup lang="ts">
import type { TeamDto, TeamReportSummaryDto } from '@tg-analyzer/shared'
import { AlertCircle, FileText, LogOut, Trash2 } from '../../../lib/icons'
import { ApiClientError } from '../../../composables/useApi'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

type Tab = 'reports' | 'members' | 'activity' | 'settings'

const route = useRoute()
const router = useRouter()
const { t, tc } = useI18n()
const teams = useTeamsStore()
const isMobile = useMediaQuery('(max-width: 640px)')
const toast = useToast()
const errorMessage = useErrorMessage()

const teamId = computed(() => String(route.params.id))
const team = ref<TeamDto | null>(null)
const reports = ref<TeamReportSummaryDto[]>([])
const notFound = ref(false)
const loadError = ref<unknown>(null)

useSeoMeta({ title: () => team.value?.name ?? t('teams.title') })

const tabs = computed(() => {
  const list: { value: Tab; label: string }[] = [
    { value: 'reports', label: t('team.tab.reports') },
    { value: 'members', label: t('team.tab.members') },
  ]
  if (team.value?.permissions.readAudit) list.push({ value: 'activity', label: t('team.tab.activity') })
  list.push({ value: 'settings', label: t('team.tab.settings') })
  return list
})
const tab = computed<Tab>({
  get: () => {
    const value = route.query.tab as Tab | undefined
    return tabs.value.some((item) => item.value === value) ? (value as Tab) : 'reports'
  },
  set: (value) => void router.replace({ query: { ...route.query, tab: value === 'reports' ? undefined : value } }),
})

const lede = computed(() =>
  team.value
    ? `${t(`teams.role.${team.value.role}`)} · ${tc('teams.memberCount', team.value.memberCount)} · ${tc(
        'teams.reportCount',
        team.value.reportCount,
      )}`
    : '',
)

async function load() {
  loadError.value = null
  try {
    const [loaded, shared] = await Promise.all([
      api('GET /api/v1/teams/:teamId', { params: { teamId: teamId.value } }),
      api('GET /api/v1/teams/:teamId/reports', { params: { teamId: teamId.value } }),
    ])
    team.value = loaded
    reports.value = shared.reports
    notFound.value = false
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) notFound.value = true
    else loadError.value = error
  }
}

const unsharing = ref<TeamReportSummaryDto | null>(null)
const busy = ref(false)

async function confirmUnshare() {
  const report = unsharing.value
  if (!report) return
  busy.value = true
  try {
    await api('DELETE /api/v1/teams/:teamId/reports/:reportId', {
      params: { teamId: teamId.value, reportId: report.reportId },
    })
    reports.value = reports.value.filter((item) => item.reportId !== report.reportId)
    if (team.value) team.value.reportCount -= 1
    toast.success(t('team.unshared'))
  } catch (error) {
    toast.error(t('team.unshareError'), errorMessage(error))
  } finally {
    busy.value = false
    unsharing.value = null
  }
}

const confirmLeave = ref<'leave' | 'delete' | null>(null)

async function leaveOrDelete() {
  if (!team.value) return
  busy.value = true
  try {
    const self = useAuthStore().user?.id
    if (confirmLeave.value === 'delete') await api('DELETE /api/v1/teams/:teamId', { params: { teamId: teamId.value } })
    else if (self)
      await api('DELETE /api/v1/teams/:teamId/members/:userId', { params: { teamId: teamId.value, userId: self } })
    teams.forget(teamId.value)
    toast.success(confirmLeave.value === 'delete' ? t('team.deleted') : t('team.left'))
    await navigateTo('/teams')
  } catch (error) {
    toast.error(t('team.leaveError'), errorMessage(error))
  } finally {
    busy.value = false
    confirmLeave.value = null
  }
}

function onRenamed(updated: TeamDto) {
  team.value = updated
  const listed = teams.teams.find((item) => item.id === updated.id)
  if (listed) listed.name = updated.name
}

function onMembersChanged(count: number) {
  if (team.value) team.value.memberCount = count
}

watch(teamId, load)
onMounted(load)
</script>

<template>
  <UiPageContainer>
    <div v-if="team" class="page">
      <UiPageHeader :title="team.name" :lede="lede" truncate>
        <template #leading>
          <UiAvatar :title="team.name" :seed="team.id" :size="isMobile ? 'md' : 'lg'" />
        </template>
      </UiPageHeader>

      <UiSegmentedControl v-model="tab" :options="tabs" :aria-label="t('team.sections')" class="team-tabs" />

      <template v-if="tab === 'reports'">
        <UiPageSection :title="t('team.reportsTitle')" :hint="t('team.reportsHint')">
          <div v-if="reports.length" class="team-reports">
            <div v-for="report in reports" :key="report.reportId" class="team-report">
              <ReportCard
                :report="report"
                :to="`/teams/${team.id}/reports/${report.reportId}`"
                :byline="
                  report.mine
                    ? t('team.sharedByYou')
                    : t('team.sharedBy', { name: report.sharedBy.name || t('team.someone') })
                "
              />
              <button
                v-if="report.mine || team.permissions.manageReports"
                type="button"
                class="link team-report__remove"
                @click="unsharing = report"
              >
                {{ report.mine ? t('team.takeBack') : t('team.takeDown') }}
              </button>
            </div>
          </div>
          <UiEmptyState
            v-else
            :icon="FileText"
            :title="t('team.noReports')"
            :description="team.permissions.shareReports ? t('team.noReportsShare') : t('team.noReportsView')"
          >
            <template v-if="team.permissions.shareReports" #action>
              <UiButton variant="secondary" to="/dashboard">{{ t('team.toMyReports') }}</UiButton>
            </template>
          </UiEmptyState>
        </UiPageSection>
      </template>

      <TeamMembers v-else-if="tab === 'members'" :team="team" @count="onMembersChanged" />
      <TeamAudit v-else-if="tab === 'activity'" :team-id="team.id" />

      <template v-else>
        <TeamPlan :team="team" />
        <TeamRename v-if="team.permissions.rename" :team="team" @renamed="onRenamed" />
        <UiPageSection :title="team.permissions.delete ? t('team.deleteTitle') : t('team.leaveTitle')">
          <div class="tile danger-zone">
            <p class="danger-zone__text">
              {{ team.permissions.delete ? t('team.deleteText') : t('team.leaveText') }}
            </p>
            <UiButton
              v-if="team.permissions.delete"
              variant="danger"
              size="sm"
              :icon="Trash2"
              @click="confirmLeave = 'delete'"
            >
              {{ t('team.delete') }}
            </UiButton>
            <UiButton v-else variant="danger-soft" size="sm" :icon="LogOut" @click="confirmLeave = 'leave'">
              {{ t('team.leave') }}
            </UiButton>
          </div>
        </UiPageSection>
      </template>
    </div>

    <UiEmptyState
      v-else-if="notFound"
      :icon="AlertCircle"
      :title="t('team.notFoundTitle')"
      :description="t('team.notFoundText')"
    >
      <template #action>
        <UiButton variant="primary" to="/teams">{{ t('teams.title') }}</UiButton>
      </template>
    </UiEmptyState>

    <UiEmptyState
      v-else-if="loadError"
      :icon="AlertCircle"
      :title="t('team.loadError')"
      :description="errorMessage(loadError)"
    >
      <template #action>
        <UiButton variant="secondary" @click="load">{{ t('common.retry') }}</UiButton>
      </template>
    </UiEmptyState>

    <UiListSkeleton v-else :rows="3" />

    <UiConfirmDialog
      :open="unsharing !== null"
      :title="unsharing?.mine ? t('team.takeBackTitle') : t('team.takeDownTitle')"
      :description="t('team.takeBackText')"
      :confirm-label="unsharing?.mine ? t('team.takeBack') : t('team.takeDown')"
      :loading="busy"
      @close="unsharing = null"
      @confirm="confirmUnshare"
    />
    <UiConfirmDialog
      :open="confirmLeave !== null"
      :title="confirmLeave === 'delete' ? t('team.deleteConfirmTitle') : t('team.leaveConfirmTitle')"
      :description="confirmLeave === 'delete' ? t('team.deleteText') : t('team.leaveText')"
      :confirm-label="confirmLeave === 'delete' ? t('team.delete') : t('team.leave')"
      variant="danger"
      :loading="busy"
      @close="confirmLeave = null"
      @confirm="leaveOrDelete"
    />
  </UiPageContainer>
</template>

<style scoped>
.team-tabs {
  max-width: 560px;
}

.team-reports {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--space-3);
}

.team-report {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

.team-report__remove {
  justify-self: start;
  margin-left: var(--space-2);
  color: var(--text-muted);
  font: var(--text-small);
}

.danger-zone {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-5);
}

.danger-zone__text {
  max-width: 52ch;
  color: var(--text-muted);
  font: var(--text-small);
}

@media (max-width: 640px) {
  .team-reports {
    grid-template-columns: minmax(0, 1fr);
  }

  .danger-zone {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>

<script setup lang="ts">
import type { ReportSharingDto, ReportSummaryDto } from '@tg-analyzer/shared'
import { Plus } from '../../lib/icons'

/**
 * Opens one of your reports to your teams, or takes it back. The switch per
 * team acts at once; members see the same report you do, never message texts.
 */
const props = defineProps<{ open: boolean; report: ReportSummaryDto | null }>()
const emit = defineEmits<{ close: [] }>()
const { t } = useI18n()
const toast = useToast()
const errorMessage = useErrorMessage()

const sharing = ref<ReportSharingDto['teams']>([])
const loading = ref(false)
const pending = ref<string | null>(null)
/** Team id → the report's id in that team, needed to take it back. */
const sharedIds = ref<Record<string, string>>({})

async function load() {
  if (!props.report) return
  loading.value = true
  try {
    sharing.value = (
      await api('GET /api/v1/reports/:chatId/sharing', { params: { chatId: props.report.chatId } })
    ).teams
  } catch (error) {
    toast.error(t('share.loadError'), errorMessage(error))
  } finally {
    loading.value = false
  }
}

async function reportIdIn(teamId: string) {
  if (sharedIds.value[teamId]) return sharedIds.value[teamId]
  const { reports } = await api('GET /api/v1/teams/:teamId/reports', { params: { teamId } })
  const userId = useAuthStore().user?.id
  const found = reports.find((item) => item.chatId === props.report?.chatId && item.sharedBy.userId === userId)
  if (found) sharedIds.value[teamId] = found.reportId
  return found?.reportId ?? null
}

async function toggle(team: ReportSharingDto['teams'][number], value: boolean) {
  if (!props.report) return
  pending.value = team.id
  try {
    if (value) {
      await api('POST /api/v1/teams/:teamId/reports', {
        params: { teamId: team.id },
        body: { chatId: props.report.chatId },
      })
      toast.success(t('share.opened', { team: team.name }))
    } else {
      const reportId = await reportIdIn(team.id)
      if (reportId)
        await api('DELETE /api/v1/teams/:teamId/reports/:reportId', { params: { teamId: team.id, reportId } })
      toast.success(t('share.closed', { team: team.name }))
    }
    team.shared = value
  } catch (error) {
    toast.error(t('share.error'), errorMessage(error))
  } finally {
    pending.value = null
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) void load()
  },
)
</script>

<template>
  <UiModalDialog
    :open="open"
    :title="t('share.title')"
    :description="t('share.description')"
    size="md"
    @close="emit('close')"
  >
    <UiListSkeleton v-if="loading && !sharing.length" :rows="2" :avatar="false" />
    <div v-else-if="sharing.length" class="share-list">
      <UiSwitch
        v-for="team in sharing"
        :key="team.id"
        :model-value="team.shared"
        :disabled="!team.canShare || pending === team.id"
        :hint="team.canShare ? t(`teams.role.${team.role}`) : t('share.viewerHint')"
        @update:model-value="(value: boolean) => toggle(team, value)"
      >
        {{ team.name }}
      </UiSwitch>
    </div>
    <div v-else class="share-empty">
      <p>{{ t('share.noTeams') }}</p>
      <UiButton variant="primary" size="sm" :icon="Plus" to="/teams" @click="emit('close')">
        {{ t('teams.create') }}
      </UiButton>
    </div>
  </UiModalDialog>
</template>

<style scoped>
.share-list {
  display: grid;
  gap: var(--space-4);
}

.share-empty {
  display: grid;
  justify-items: start;
  gap: var(--space-4);
  color: var(--text-muted);
  font: var(--text-ui);
}
</style>

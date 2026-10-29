<script setup lang="ts">
import type { InvitePreviewDto } from '@tg-analyzer/shared'
import { AlertCircle, Users } from '../../lib/icons'
import { ApiClientError } from '../../composables/useApi'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

/** Opening an invitation link: see which team it is and what you will be able to do, then join. */
const route = useRoute()
const { t, tc } = useI18n()
const teams = useTeamsStore()
const toast = useToast()
const errorMessage = useErrorMessage()

useSeoMeta({ title: () => t('invite.title') })

const token = computed(() => String(route.params.token))
const preview = ref<InvitePreviewDto | null>(null)
const invalid = ref(false)
const loadError = ref<unknown>(null)
const joining = ref(false)

async function load() {
  loadError.value = null
  try {
    preview.value = await api('GET /api/v1/invites/:token', { params: { token: token.value } })
  } catch (error) {
    if (error instanceof ApiClientError && (error.status === 404 || error.status === 400)) invalid.value = true
    else loadError.value = error
  }
}

async function join() {
  joining.value = true
  try {
    const { teamId } = await api('POST /api/v1/invites/:token/accept', { params: { token: token.value } })
    void teams.load().catch(() => undefined)
    toast.success(t('invite.joined', { team: preview.value?.teamName ?? '' }))
    await navigateTo(`/teams/${teamId}`, { replace: true })
  } catch (error) {
    toast.error(t('invite.joinError'), errorMessage(error))
  } finally {
    joining.value = false
  }
}

onMounted(load)
</script>

<template>
  <UiPageContainer size="narrow">
    <div v-if="preview" class="page">
      <UiPageHeader
        :title="t('invite.heading', { team: preview.teamName })"
        :lede="
          preview.invitedBy
            ? t('invite.ledeFrom', { name: preview.invitedBy, count: tc('teams.memberCount', preview.memberCount) })
            : tc('teams.memberCount', preview.memberCount)
        "
      >
        <template #leading><UiAvatar :title="preview.teamName" :seed="preview.teamId" size="lg" /></template>
      </UiPageHeader>

      <div class="tile invite-card">
        <span class="icon-tile" aria-hidden="true"><Users /></span>
        <div class="invite-card__copy">
          <strong class="t-title">{{ t('invite.role', { role: t(`teams.role.${preview.role}`) }) }}</strong>
          <span>{{ t(`teams.roleHint.${preview.role}`) }}</span>
          <span>{{ t('invite.privacy') }}</span>
        </div>
      </div>

      <div class="invite-actions">
        <UiButton v-if="preview.alreadyMember" variant="primary" size="lg" :to="`/teams/${preview.teamId}`">
          {{ t('invite.open') }}
        </UiButton>
        <UiButton v-else variant="primary" size="lg" :loading="joining" @click="join">{{ t('invite.join') }}</UiButton>
        <UiButton variant="ghost" size="lg" to="/dashboard">{{ t('invite.later') }}</UiButton>
      </div>
    </div>

    <UiEmptyState
      v-else-if="invalid"
      :icon="AlertCircle"
      :title="t('invite.invalidTitle')"
      :description="t('invite.invalidText')"
    >
      <template #action>
        <UiButton variant="primary" to="/dashboard">{{ t('common.goToChats') }}</UiButton>
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

    <UiListSkeleton v-else :rows="2" />
  </UiPageContainer>
</template>

<style scoped>
.invite-card {
  display: flex;
  flex-direction: row;
  gap: var(--space-4);
  padding: var(--space-5);
}

.invite-card__copy {
  display: grid;
  gap: var(--space-2);
  color: var(--text-muted);
  font: var(--text-small);
}

.invite-card__copy strong {
  color: var(--text);
}

.invite-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

@media (max-width: 640px) {
  .invite-actions > * {
    flex: 1 1 100%;
  }
}
</style>

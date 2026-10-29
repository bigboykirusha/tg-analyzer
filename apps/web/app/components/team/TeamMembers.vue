<script setup lang="ts">
import {
  ASSIGNABLE_TEAM_ROLES,
  canManageMember,
  type AssignableTeamRole,
  type TeamDto,
  type TeamInviteDto,
  type TeamMemberDto,
} from '@tg-analyzer/shared'
import { Copy, Link, Trash2, UserPlus, X } from '../../lib/icons'

const props = defineProps<{ team: TeamDto }>()
const emit = defineEmits<{ count: [value: number] }>()
const { t, formatRelative, formatDate } = useI18n()
const toast = useToast()
const errorMessage = useErrorMessage()

const members = ref<TeamMemberDto[]>([])
const invites = ref<TeamInviteDto[]>([])
const loading = ref(true)
const removing = ref<TeamMemberDto | null>(null)
const busy = ref(false)

const params = computed(() => ({ teamId: props.team.id }))
const atLimit = computed(() => members.value.length >= props.team.limits.members)

const roleOptions = computed(() =>
  ASSIGNABLE_TEAM_ROLES.map((role) => ({ value: role, label: t(`teams.role.${role}`) })),
)

const canManage = (member: TeamMemberDto) => !member.isYou && canManageMember(props.team.role, member.role)
const displayName = (member: TeamMemberDto) => member.name || member.username || t('team.someone')

async function load() {
  loading.value = true
  try {
    const [list, links] = await Promise.all([
      api('GET /api/v1/teams/:teamId/members', { params: params.value }),
      props.team.permissions.manageInvites
        ? api('GET /api/v1/teams/:teamId/invites', { params: params.value })
        : Promise.resolve({ invites: [] }),
    ])
    members.value = list.members
    invites.value = links.invites
    emit('count', list.members.length)
  } catch (error) {
    toast.error(t('team.loadError'), errorMessage(error))
  } finally {
    loading.value = false
  }
}

async function changeRole(member: TeamMemberDto, role: AssignableTeamRole) {
  const previous = member.role
  member.role = role
  try {
    await api('PATCH /api/v1/teams/:teamId/members/:userId', {
      params: { ...params.value, userId: member.userId },
      body: { role },
    })
    toast.success(t('team.roleChanged', { name: displayName(member), role: t(`teams.role.${role}`) }))
  } catch (error) {
    member.role = previous
    toast.error(t('team.roleError'), errorMessage(error))
  }
}

async function confirmRemove() {
  const member = removing.value
  if (!member) return
  busy.value = true
  try {
    await api('DELETE /api/v1/teams/:teamId/members/:userId', { params: { ...params.value, userId: member.userId } })
    members.value = members.value.filter((item) => item.userId !== member.userId)
    emit('count', members.value.length)
    toast.success(t('team.removed', { name: displayName(member) }))
  } catch (error) {
    toast.error(t('team.removeError'), errorMessage(error))
  } finally {
    busy.value = false
    removing.value = null
  }
}

// ─── Invitations ──────────────────────────────────────────────────────────

const inviteRole = ref<AssignableTeamRole>('analyst')
const creating = ref(false)
/** The link exists in full only right after it is made: the server keeps a hash. */
const freshLink = ref<string | null>(null)

async function createInvite() {
  creating.value = true
  try {
    const { invite, token } = await api('POST /api/v1/teams/:teamId/invites', {
      params: params.value,
      body: { role: inviteRole.value },
    })
    invites.value = [invite, ...invites.value]
    freshLink.value = `${window.location.origin}/invite/${token}`
    await copy(freshLink.value)
  } catch (error) {
    toast.error(t('team.inviteError'), errorMessage(error))
  } finally {
    creating.value = false
  }
}

async function copy(value: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(t('team.linkCopied'))
  } catch {
    // Clipboard can be blocked; the link stays on screen to copy by hand.
  }
}

async function revoke(invite: TeamInviteDto) {
  try {
    await api('DELETE /api/v1/teams/:teamId/invites/:inviteId', { params: { ...params.value, inviteId: invite.id } })
    invites.value = invites.value.filter((item) => item.id !== invite.id)
    if (invites.value.length === 0) freshLink.value = null
    toast.success(t('team.inviteRevoked'))
  } catch (error) {
    toast.error(t('team.inviteError'), errorMessage(error))
  }
}

onMounted(load)
</script>

<template>
  <UiPageSection
    v-if="team.permissions.manageInvites"
    :title="t('team.inviteTitle')"
    :hint="atLimit ? t('team.inviteAtLimit', { limit: team.limits.members }) : t('team.inviteHint')"
  >
    <div class="tile invite">
      <div class="invite__row">
        <UiSelect
          v-model="inviteRole"
          class="invite__role"
          :options="roleOptions"
          :aria-label="t('team.inviteRole')"
          :disabled="atLimit"
        />
        <UiButton variant="primary" :icon="UserPlus" :loading="creating" :disabled="atLimit" @click="createInvite">
          {{ t('team.createLink') }}
        </UiButton>
      </div>
      <p class="invite__role-hint">{{ t(`teams.roleHint.${inviteRole}`) }}</p>
      <div v-if="freshLink" class="invite__fresh">
        <Link aria-hidden="true" />
        <code class="invite__url">{{ freshLink }}</code>
        <UiIconButton :icon="Copy" :label="t('team.copyLink')" variant="ghost" @click="copy(freshLink)" />
      </div>
      <ul v-if="invites.length" class="invite__list">
        <li v-for="invite in invites" :key="invite.id" class="invite__item">
          <span class="invite__copy">
            <strong>{{ t(`teams.role.${invite.role}`) }}</strong>
            <small class="t-num">
              {{
                t('team.inviteMeta', {
                  date: formatDate(invite.expiresAt, { day: 'numeric', month: 'long' }),
                  uses: invite.uses,
                })
              }}
            </small>
          </span>
          <UiIconButton :icon="X" :label="t('team.revoke')" variant="ghost" @click="revoke(invite)" />
        </li>
      </ul>
    </div>
  </UiPageSection>

  <UiPageSection
    :title="t('team.membersTitle')"
    :hint="t('team.membersHint', { count: members.length, limit: team.limits.members })"
  >
    <UiListSkeleton v-if="loading" :rows="3" />
    <ul v-else class="tile members">
      <li v-for="member in members" :key="member.userId" class="member">
        <UiAvatar :title="displayName(member)" :seed="member.userId" size="sm" />
        <span class="member__copy">
          <strong class="member__name">
            {{ displayName(member) }}<span v-if="member.isYou" class="member__you"> · {{ t('team.you') }}</span>
          </strong>
          <small>{{
            member.username ? `@${member.username}` : t('team.joined', { time: formatRelative(member.joinedAt) })
          }}</small>
        </span>
        <template v-if="canManage(member)">
          <UiSelect
            class="member__role"
            :model-value="member.role as AssignableTeamRole"
            :options="roleOptions"
            :aria-label="t('team.roleOf', { name: displayName(member) })"
            @update:model-value="(role) => role && changeRole(member, role)"
          />
          <UiIconButton
            :icon="Trash2"
            :label="t('team.remove', { name: displayName(member) })"
            variant="ghost"
            @click="removing = member"
          />
        </template>
        <span v-else class="member__badge">{{ t(`teams.role.${member.role}`) }}</span>
      </li>
    </ul>
  </UiPageSection>

  <UiConfirmDialog
    :open="removing !== null"
    :title="t('team.removeTitle', { name: removing ? displayName(removing) : '' })"
    :description="t('team.removeText')"
    :confirm-label="t('team.removeConfirm')"
    variant="danger"
    :loading="busy"
    @close="removing = null"
    @confirm="confirmRemove"
  />
</template>

<style scoped>
.invite {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-4);
}

.invite__row {
  display: flex;
  gap: var(--space-3);
}

.invite__role-hint {
  margin-top: calc(var(--space-2) - var(--space-4));
  color: var(--text-muted);
  font: var(--text-small);
}

.invite__role {
  flex: 1;
  min-width: 0;
}

.invite__fresh {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-2) var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--surface-2);
  color: var(--text-muted);
}

.invite__url {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--text);
  font: var(--text-small);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.invite__list {
  display: grid;
}

.invite__item,
.member {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.invite__item {
  padding-block: var(--space-2);
  border-top: 1px solid var(--border);
}

.invite__copy,
.member__copy {
  display: grid;
  flex: 1;
  gap: 2px;
  min-width: 0;
  font: var(--text-ui);
}

.invite__copy small,
.member__copy small {
  overflow: hidden;
  color: var(--text-muted);
  font: var(--text-small);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.members {
  display: grid;
  padding: var(--space-2) var(--space-4);
}

.member {
  padding-block: var(--space-3);
}

.member + .member {
  border-top: 1px solid var(--border);
}

.member__name {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member__you {
  color: var(--text-muted);
  font-weight: 400;
}

.member__role {
  flex: 0 0 168px;
}

.member__badge {
  flex: none;
  color: var(--text-muted);
  font: var(--text-small);
}

@media (max-width: 640px) {
  .invite__row {
    flex-direction: column;
  }

  .member {
    flex-wrap: wrap;
  }

  /* Phones: the role picker drops under the name, the remove button stays on the right. */
  .member__role {
    flex: 1 1 calc(100% - 96px);
    order: 3;
    margin-left: calc(36px + var(--space-3));
  }
}
</style>

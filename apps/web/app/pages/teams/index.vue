<script setup lang="ts">
import { OWNED_TEAMS_LIMIT, PLAN_LIMITS } from '@tg-analyzer/shared'
import { ChevronRight, Lock, Plus, Users, Eye } from '../../lib/icons'

definePageMeta({ layout: 'workspace', middleware: ['auth'] })

const { t, tc } = useI18n()
useSeoMeta({ title: () => t('teams.title') })

const teams = useTeamsStore()
const toast = useToast()
const errorMessage = useErrorMessage()

const name = ref('')
const creating = ref(false)
const owned = computed(() => teams.teams.filter((team) => team.role === 'owner').length)
const canCreate = computed(() => owned.value < OWNED_TEAMS_LIMIT)

async function create() {
  if (!name.value.trim()) return
  creating.value = true
  try {
    const team = await teams.create(name.value)
    name.value = ''
    await navigateTo(`/teams/${team.id}`)
  } catch (error) {
    toast.error(t('teams.createError'), errorMessage(error))
  } finally {
    creating.value = false
  }
}

const promises = computed(() => [
  { icon: Lock, title: t('teams.promise.privateTitle'), text: t('teams.promise.privateText') },
  { icon: Users, title: t('teams.promise.rolesTitle'), text: t('teams.promise.rolesText') },
  {
    icon: Eye,
    title: t('teams.promise.freeTitle'),
    text: t('teams.promise.freeText', {
      members: PLAN_LIMITS.free.members,
      reports: PLAN_LIMITS.free.sharedReports,
    }),
  },
])

onMounted(() => void teams.load().catch(() => undefined))
</script>

<template>
  <UiPageContainer size="narrow">
    <div class="page">
      <UiPageHeader :title="t('teams.title')" :lede="t('teams.lede')" />

      <UiPageSection v-if="teams.teams.length" :title="t('teams.yours')">
        <ul class="team-list">
          <li v-for="team in teams.teams" :key="team.id">
            <NuxtLink :to="`/teams/${team.id}`" class="tile team-row">
              <span class="icon-tile" aria-hidden="true"><Users /></span>
              <span class="team-row__copy">
                <strong class="t-title">{{ team.name }}</strong>
                <small class="team-row__meta t-num">
                  {{ t(`teams.role.${team.role}`) }} · {{ tc('teams.memberCount', team.memberCount) }} ·
                  {{ tc('teams.reportCount', team.reportCount) }}
                </small>
              </span>
              <span class="plan-badge">{{ t(`plans.${team.plan}.name`) }}</span>
              <ChevronRight class="team-row__chevron" aria-hidden="true" />
            </NuxtLink>
          </li>
        </ul>
      </UiPageSection>

      <ul v-else-if="teams.state === 'ready'" class="promises">
        <li v-for="item in promises" :key="item.title" class="tile promise">
          <span class="icon-tile" aria-hidden="true"><component :is="item.icon" /></span>
          <strong class="t-title">{{ item.title }}</strong>
          <span class="promise__text">{{ item.text }}</span>
        </li>
      </ul>

      <UiListSkeleton v-else-if="teams.state === 'loading'" :rows="2" />

      <UiPageSection :title="t('teams.createTitle')" :hint="canCreate ? t('teams.createHint') : t('errors.teamsLimit')">
        <form class="tile create" @submit.prevent="create">
          <label class="field create__field">
            <span class="sr-only">{{ t('teams.nameLabel') }}</span>
            <input
              v-model="name"
              class="input"
              maxlength="80"
              autocomplete="off"
              :placeholder="t('teams.namePlaceholder')"
              :disabled="!canCreate"
            />
          </label>
          <UiButton
            type="submit"
            variant="primary"
            :icon="Plus"
            :loading="creating"
            :disabled="!canCreate || !name.trim()"
          >
            {{ t('teams.create') }}
          </UiButton>
        </form>
      </UiPageSection>
    </div>
  </UiPageContainer>
</template>

<style scoped>
.team-list {
  display: grid;
  gap: var(--space-2);
}

.team-row {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  transition: box-shadow var(--transition-fast);
}

@media (hover: hover) {
  .team-row:hover {
    box-shadow: 0 0 0 1px var(--border-strong);
  }
}

.team-row__copy {
  display: grid;
  flex: 1;
  gap: 2px;
  min-width: 0;
}

.team-row__copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.team-row__meta {
  color: var(--text-muted);
  font: var(--text-small);
}

.team-row__chevron {
  flex: none;
  color: var(--text-faint);
}

.plan-badge {
  flex: none;
  padding: 3px var(--space-2);
  border-radius: var(--radius-full);
  background: var(--surface-2);
  color: var(--text-muted);
  font: var(--text-caption);
  font-weight: 600;
}

.promises {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
}

.promise {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  padding: var(--space-5);
}

.promise .icon-tile {
  margin-bottom: var(--space-2);
}

.promise__text {
  color: var(--text-muted);
  font: var(--text-small);
}

.create {
  display: flex;
  flex-direction: row;
  gap: var(--space-3);
  padding: var(--space-4);
}

.create__field {
  flex: 1;
}

@media (max-width: 640px) {
  .promises {
    grid-template-columns: minmax(0, 1fr);
  }

  .create {
    flex-direction: column;
  }

  .team-row {
    gap: var(--space-3);
    padding: var(--space-4);
  }

  .team-row .icon-tile {
    display: none;
  }
}
</style>

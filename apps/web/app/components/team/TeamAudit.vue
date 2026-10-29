<script setup lang="ts">
import type { AuditEntryDto } from '@tg-analyzer/shared'

/** Who did what in the team, newest first, loaded a page at a time. */
const props = defineProps<{ teamId: string }>()
const { t, formatDate } = useI18n()
const toast = useToast()
const errorMessage = useErrorMessage()

const entries = ref<AuditEntryDto[]>([])
const nextBefore = ref<string | null>(null)
const loading = ref(true)

async function load(before?: string) {
  loading.value = true
  try {
    const page = await api('GET /api/v1/teams/:teamId/audit', {
      params: { teamId: props.teamId },
      query: before ? { before } : {},
    })
    entries.value = before ? [...entries.value, ...page.entries] : page.entries
    nextBefore.value = page.nextBefore
  } catch (error) {
    toast.error(t('team.loadError'), errorMessage(error))
  } finally {
    loading.value = false
  }
}

function describe(entry: AuditEntryDto) {
  const someone = t('team.someone')
  return t(`audit.${entry.action}`, {
    actor: entry.actor || someone,
    subject: entry.subject || someone,
    role: entry.details.role ? t(`teams.role.${entry.details.role}`) : '',
    previous: entry.details.previousRole ? t(`teams.role.${entry.details.previousRole}`) : '',
    title: entry.details.title ?? '',
    name: entry.details.name ?? '',
  })
}

const when = (value: string) =>
  formatDate(value, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

onMounted(() => void load())
</script>

<template>
  <UiPageSection :title="t('team.activityTitle')" :hint="t('team.activityHint')">
    <UiListSkeleton v-if="loading && !entries.length" :rows="4" :avatar="false" />
    <ol v-else class="tile log">
      <li v-for="entry in entries" :key="entry.id" class="log__item">
        <span class="log__text">{{ describe(entry) }}</span>
        <time class="log__time t-num" :datetime="entry.createdAt">{{ when(entry.createdAt) }}</time>
      </li>
    </ol>
    <UiButton v-if="nextBefore" variant="ghost" size="sm" :loading="loading" @click="load(nextBefore)">
      {{ t('team.activityMore') }}
    </UiButton>
  </UiPageSection>
</template>

<style scoped>
.log {
  display: grid;
  padding: var(--space-2) var(--space-5);
}

.log__item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
  padding-block: var(--space-3);
  font: var(--text-ui);
}

.log__item + .log__item {
  border-top: 1px solid var(--border);
}

.log__text {
  min-width: 0;
}

.log__time {
  flex: none;
  color: var(--text-muted);
  font: var(--text-small);
}

@media (max-width: 640px) {
  .log {
    padding-inline: var(--space-4);
  }

  .log__item {
    flex-direction: column;
    gap: 2px;
  }
}
</style>

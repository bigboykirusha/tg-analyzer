<script setup lang="ts">
import type { TeamDto } from '@tg-analyzer/shared'

const props = defineProps<{ team: TeamDto }>()
const emit = defineEmits<{ renamed: [team: TeamDto] }>()
const { t } = useI18n()
const toast = useToast()
const errorMessage = useErrorMessage()

const name = ref(props.team.name)
const saving = ref(false)
const changed = computed(() => name.value.trim() && name.value.trim() !== props.team.name)

async function save() {
  if (!changed.value) return
  saving.value = true
  try {
    const team = await api('PATCH /api/v1/teams/:teamId', {
      params: { teamId: props.team.id },
      body: { name: name.value },
    })
    emit('renamed', team)
    toast.success(t('team.renamed'))
  } catch (error) {
    toast.error(t('team.renameError'), errorMessage(error))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiPageSection :title="t('team.nameTitle')">
    <form class="tile rename" @submit.prevent="save">
      <label class="field rename__field">
        <span class="sr-only">{{ t('teams.nameLabel') }}</span>
        <input v-model="name" class="input" maxlength="80" autocomplete="off" />
      </label>
      <UiButton type="submit" variant="secondary" :loading="saving" :disabled="!changed">{{ t('team.save') }}</UiButton>
    </form>
  </UiPageSection>
</template>

<style scoped>
.rename {
  display: flex;
  flex-direction: row;
  gap: var(--space-3);
  padding: var(--space-4);
}

.rename__field {
  flex: 1;
}

@media (max-width: 640px) {
  .rename {
    flex-direction: column;
  }
}
</style>

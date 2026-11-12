<script setup lang="ts">
import type { GroupParticipantDto, GroupReportDto } from '@tg-analyzer/shared'
import { HeartHandshake } from '../../../lib/icons'

/** «Пары»: the three pairs who answer each other most, one row each — two avatars and the two names. */
const props = defineProps<{ group: GroupReportDto }>()
const { t } = useI18n()
const nameOf = useParticipantName()

const byId = computed(() => new Map(props.group.participants.map((person) => [person.id, person])))
const member = (id: string, name: string): Pick<GroupParticipantDto, 'id' | 'name' | 'isSelf'> =>
  byId.value.get(id) ?? { id, name, isSelf: false }

const pairs = computed(() =>
  props.group.topPairs.slice(0, 3).map((pair) => ({
    key: `${pair.leftParticipantId}-${pair.rightParticipantId}`,
    left: member(pair.leftParticipantId, pair.leftParticipantName),
    right: member(pair.rightParticipantId, pair.rightParticipantName),
  })),
)
</script>

<template>
  <ReportSection
    v-if="pairs.length"
    id="part-pairs"
    :icon="HeartHandshake"
    :title="t('group.pairs.title')"
    :answer="t('group.pairs.lead')"
  >
    <div class="pairs">
      <UiListRow
        v-for="pair in pairs"
        :key="pair.key"
        :title="t('group.pairs.names', { left: nameOf(pair.left), right: nameOf(pair.right) })"
      >
        <template #leading>
          <span class="duo">
            <UiAvatar
              :title="nameOf(pair.left)"
              :seed="pair.left.id"
              :side="pair.left.isSelf ? 'mine' : null"
              size="xs"
            />
            <UiAvatar
              :title="nameOf(pair.right)"
              :seed="pair.right.id"
              :side="pair.right.isSelf ? 'mine' : null"
              size="xs"
            />
          </span>
        </template>
      </UiListRow>
    </div>
  </ReportSection>
</template>

<style scoped>
.pairs > :deep(:last-child .list-row__body) {
  box-shadow: none;
}

/* Two small avatars side by side, nothing cut off. */
.duo {
  display: inline-flex;
  gap: var(--space-1);
}
</style>

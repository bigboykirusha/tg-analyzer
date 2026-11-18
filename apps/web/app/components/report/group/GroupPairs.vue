<script setup lang="ts">
import type { GroupParticipantDto, GroupReportDto } from '@tg-analyzer/shared'
import { HeartHandshake } from '../../../lib/icons'

/** The three closest pairs, with direct replies and adjoining turns shown separately. */
const props = defineProps<{ group: GroupReportDto }>()
const { t } = useI18n()
const nameOf = useParticipantName()
const pairDetail = useGroupPairDetail()

const byId = computed(() => new Map(props.group.participants.map((person) => [person.id, person])))
const member = (id: string, name: string): Pick<GroupParticipantDto, 'id' | 'name' | 'isSelf'> =>
  byId.value.get(id) ?? { id, name, isSelf: false }

const pairs = computed(() =>
  props.group.topPairs.slice(0, 3).map((pair) => ({
    key: `${pair.leftParticipantId}-${pair.rightParticipantId}`,
    left: member(pair.leftParticipantId, pair.leftParticipantName),
    right: member(pair.rightParticipantId, pair.rightParticipantName),
    detail: pairDetail(pair),
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
    wide
  >
    <div class="pairs">
      <UiListRow
        v-for="pair in pairs"
        :key="pair.key"
        wrap
        :title="t('group.pairs.names', { left: nameOf(pair.left), right: nameOf(pair.right) })"
        :subtitle="pair.detail"
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
    <template #note>{{ t('group.pairs.note') }}</template>
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

@media (min-width: 901px) {
  .pairs {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, calc(var(--space-16) * 4)), 1fr));
    gap: var(--space-2) var(--space-6);
  }

  .pairs > :deep(.list-row .list-row__body) {
    box-shadow: none;
  }
}
</style>

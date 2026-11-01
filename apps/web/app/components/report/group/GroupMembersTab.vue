<script setup lang="ts">
import type { GroupReportDto } from '@tg-analyzer/shared'
import { ChevronRight } from '../../../lib/icons'

const props = defineProps<{ group: GroupReportDto }>()
const { t, formatPercent } = useI18n()
const nameOf = useParticipantName()
const ranked = computed(() => [...props.group.participants].sort((a, b) => b.messageCount - a.messageCount))
const selectedId = ref<string | null>(null)
const selected = computed(() => ranked.value.find((item) => item.id === selectedId.value) ?? ranked.value[0] ?? null)
const isMobile = useMediaQuery('(max-width: 900px)')
const detailsOpen = ref(false)

function selectMember(id: string, event: MouseEvent) {
  // Safari does not focus buttons on pointer activation; remember a real return target.
  const trigger = event.currentTarget as HTMLButtonElement
  trigger.focus({ preventScroll: true })
  selectedId.value = id
  detailsOpen.value = isMobile.value
}
watch(isMobile, () => {
  detailsOpen.value = false
})
</script>

<template>
  <div class="members">
    <ReportSection :title="t('group.membersTitle')" :text="t('group.membersText')">
      <ul class="member-list">
        <li v-for="participant in ranked" :key="participant.id">
          <button
            type="button"
            class="member"
            :class="{ 'member--active': participant.id === selected?.id }"
            :aria-pressed="participant.id === selected?.id"
            :aria-haspopup="isMobile ? 'dialog' : undefined"
            :aria-expanded="isMobile && participant.id === selected?.id ? detailsOpen : undefined"
            @click="selectMember(participant.id, $event)"
          >
            <UiAvatar :title="nameOf(participant)" size="sm" />
            <span class="member__copy">
              <span class="member__name">{{ nameOf(participant) }}</span>
              <span class="t-small t-muted">{{ t(`group.roles.${participant.role}`) }}</span>
            </span>
            <span class="member__share t-num">{{ formatPercent(participant.messageShare) }}</span>
            <ChevronRight class="member__chevron" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </ReportSection>

    <ReportSection v-if="selected && !isMobile" :title="nameOf(selected)">
      <GroupMemberDetails :participant="selected" :group="group" />
    </ReportSection>
    <UiBottomSheet
      :open="isMobile && detailsOpen"
      :title="selected ? nameOf(selected) : ''"
      @close="detailsOpen = false"
    >
      <GroupMemberDetails v-if="selected" :participant="selected" :group="group" />
      <template #actions>
        <UiButton variant="secondary" @click="detailsOpen = false">{{ t('common.close') }}</UiButton>
      </template>
    </UiBottomSheet>
  </div>
</template>

<style scoped>
.members {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  gap: var(--space-5);
  align-items: start;
}

.member-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 640px;
  overflow-y: auto;
  list-style: none;
}

.member {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background var(--transition-fast);
}

@media (hover: hover) and (pointer: fine) {
  .member:hover {
    background: var(--surface-2);
  }
}

.member--active {
  border-color: var(--accent-border);
  background: var(--accent-subtle);
}

.member__copy {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
}

.member__name {
  overflow: hidden;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member__share {
  color: var(--text-muted);
}

.member__chevron {
  display: none;
  color: var(--text-muted);
  flex: none;
}

@media (max-width: 900px) {
  .members {
    grid-template-columns: minmax(0, 1fr);
  }

  .member-list {
    max-height: 360px;
  }

  .member__chevron {
    display: block;
  }
}
</style>

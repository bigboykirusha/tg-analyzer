<script setup lang="ts">
import type { GroupReportDto } from '@tg-analyzer/shared'
import { ChevronRight } from '../../../lib/icons'

const props = defineProps<{ group: GroupReportDto }>()
const { t, formatPercent } = useI18n()
const nameOf = useParticipantName()
const ranked = computed(() => [...props.group.participants].sort((a, b) => b.messageCount - a.messageCount))
const selectedId = ref<string | null>(null)

// A long list shows the most active members first; the rest open on request, without a scroll inside the page.
const MEMBER_PREVIEW = 4
const showAllMembers = ref(false)
const visibleMembers = computed(() => (showAllMembers.value ? ranked.value : ranked.value.slice(0, MEMBER_PREVIEW)))
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
        <li v-for="participant in visibleMembers" :key="participant.id">
          <button
            type="button"
            class="member"
            :class="{ 'member--active': !isMobile && participant.id === selected?.id }"
            :aria-pressed="isMobile ? undefined : participant.id === selected?.id"
            :aria-haspopup="isMobile ? 'dialog' : undefined"
            :aria-expanded="isMobile && participant.id === selected?.id ? detailsOpen : undefined"
            @click="selectMember(participant.id, $event)"
          >
            <UiAvatar
              :title="nameOf(participant)"
              :seed="participant.id"
              :side="participant.isSelf ? 'mine' : null"
              size="sm"
            />
            <span class="member__copy">
              <span class="member__name">{{ nameOf(participant) }}</span>
              <span class="t-small t-muted">{{ t(`group.roles.${participant.role}`) }}</span>
            </span>
            <span class="member__share t-num">{{ formatPercent(participant.messageShare) }}</span>
          </button>
        </li>
        <li v-if="ranked.length > MEMBER_PREVIEW">
          <button
            type="button"
            class="member member--more"
            :aria-expanded="showAllMembers"
            @click="showAllMembers = !showAllMembers"
          >
            <span class="member__copy member__name">
              {{ showAllMembers ? t('group.membersCollapse') : t('group.membersShowAll', { count: ranked.length }) }}
            </span>
            <ChevronRight
              class="member__chevron"
              :class="{ 'member__chevron--up': showAllMembers }"
              aria-hidden="true"
            />
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
  gap: var(--space-6);
  align-items: start;
}

.member-list {
  display: flex;
  flex-direction: column;
  list-style: none;
}

/* Rows divided by hairlines, like every list inside a card. */
.member-list li + li {
  box-shadow: var(--divider-top);
}

.member {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: var(--hit-min);
  padding: var(--space-2) 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  text-align: left;
}

/* Wide screens: the member whose details are open beside the list is a selected row. */
.member--active {
  margin-inline: calc(-1 * var(--space-3));
  padding-inline: var(--space-3);
  width: calc(100% + var(--space-3) * 2);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}

@media (hover: hover) and (pointer: fine) {
  .member:not(.member--active):hover .member__name {
    text-decoration: underline;
  }
}

.member__copy {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
}

.member__name {
  overflow: hidden;
  font: var(--text-title);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member--more .member__name {
  font: var(--text-ui);
}

.member__share {
  color: var(--text);
  font: var(--text-title);
  font-weight: 600;
}

.member__chevron {
  flex: none;
  color: var(--text-muted);
  transition: transform var(--transition-fast);
}

.member__chevron--up {
  transform: rotate(-90deg);
}

@media (max-width: 900px) {
  .members {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

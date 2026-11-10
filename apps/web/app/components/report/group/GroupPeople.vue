<script setup lang="ts">
import type { GroupParticipantDto, GroupReportDto } from '@tg-analyzer/shared'

/**
 * «Люди»: who takes part and how — you first, then the others by their share of the messages; a tap
 * opens the member (a sheet on a phone, the panel beside the list on desktop).
 */
const props = defineProps<{ group: GroupReportDto }>()
const { t, tc, formatPercent } = useI18n()
const nameOf = useParticipantName()

const ranked = computed(() =>
  [...props.group.participants].sort((a, b) => Number(b.isSelf) - Number(a.isSelf) || b.messageCount - a.messageCount),
)
const others = computed(() => ranked.value.filter((person) => !person.isSelf))

// A long list shows you and the four biggest voices; the rest open on request.
const PREVIEW = 5
const showAll = ref(false)
const visible = computed(() => (showAll.value ? ranked.value : ranked.value.slice(0, PREVIEW)))

const wide = useMediaQuery('(min-width: 901px)')
const selectedId = ref<string | null>(null)
const sheetOpen = ref(false)
/** Desktop always shows someone in the panel: the biggest voice until a row is picked. */
const selected = computed(
  () => others.value.find((person) => person.id === selectedId.value) ?? others.value[0] ?? null,
)
function open(id: string) {
  selectedId.value = id
  sheetOpen.value = !wide.value
}
watch(wide, () => {
  sheetOpen.value = false
})

/** The heading already says «Ядро — N»; a role is spelled out only where it adds something. */
const roleLabel = (role: GroupParticipantDto['role']) => (role === 'anchor' ? undefined : t(`group.roles.${role}`))

/** «Ядро — четыре человека», or that nobody leads. */
const answer = computed(() => {
  const core = props.group.participants.filter((person) => person.role === 'anchor').length
  return core ? tc('group.core', core) : t('group.coreNone')
})
</script>

<template>
  <div class="people" :class="{ 'people--solo': !selected }">
    <div class="people__main">
      <ReportSection id="part-people" :title="t('group.tabs.people')" :answer="answer">
        <div class="people__list">
          <template v-for="person in visible" :key="person.id">
            <UiListRow v-if="person.isSelf" :title="nameOf(person)" :subtitle="roleLabel(person.role)">
              <template #leading><UiAvatar :title="nameOf(person)" side="mine" size="md" /></template>
              <template #trailing>
                <span class="people__share people__share--self">{{ formatPercent(person.messageShare) }}</span>
              </template>
            </UiListRow>
            <UiListRow
              v-else
              as="button"
              chevron
              :title="nameOf(person)"
              :subtitle="roleLabel(person.role)"
              :selected="wide && person.id === selected?.id"
              :aria-pressed="wide ? person.id === selected?.id : undefined"
              :aria-haspopup="wide ? undefined : 'dialog'"
              @click="open(person.id)"
            >
              <template #leading><UiAvatar :title="nameOf(person)" :seed="person.id" size="md" /></template>
              <template #trailing>
                <span class="people__share">{{ formatPercent(person.messageShare) }}</span>
              </template>
            </UiListRow>
          </template>
          <UiListRow
            v-if="ranked.length > PREVIEW"
            as="button"
            chevron
            :title="showAll ? t('group.membersCollapse') : t('group.membersShowAll', { count: ranked.length })"
            :aria-expanded="showAll"
            @click="showAll = !showAll"
          />
        </div>
      </ReportSection>
    </div>

    <aside v-if="selected && wide" class="tile people__panel">
      <GroupMemberDetails :participant="selected" :group="group" />
    </aside>
    <UiBottomSheet :open="!wide && sheetOpen" :title="t('group.member')" @close="sheetOpen = false">
      <GroupMemberDetails v-if="selected" :participant="selected" :group="group" />
    </UiBottomSheet>
  </div>
</template>

<style scoped>
.people,
.people__main {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);
  min-width: 0;
}

/* Rows reach the tile's text edge; the last one has no hairline. */
.people__list > :deep(:last-child .list-row__body) {
  box-shadow: none;
}

.people__share {
  color: var(--text);
  font: var(--text-label);
}

/* Your own row has no chevron: the number stands where the others' numbers stand. */
.people__share--self {
  margin-right: calc(var(--icon-sm) + var(--space-3));
}

/* Desktop: the list on the left, the member beside it, staying in view while the list scrolls. */
@media (min-width: 901px) {
  .people:not(.people--solo) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, var(--inspector-width));
    align-items: start;
  }

  .people__panel {
    position: sticky;
    top: calc(var(--topbar-height) + var(--space-4));
    gap: var(--space-6);
  }
}
</style>

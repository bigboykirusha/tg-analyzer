<script setup lang="ts">
import type { DerivedGroupWords, GroupParticipantDto, GroupReportDto } from '@tg-analyzer/shared'
import { Users } from '../../../lib/icons'

/**
 * «Люди»: who takes part and how — you first, then the others by their share of the messages; a tap
 * opens the member (a sheet on a phone, the panel beside the list on desktop).
 */
/** `words`: the members' words with the thin ones left out (`derived.words.group`). */
const props = defineProps<{ group: GroupReportDto; words: DerivedGroupWords | null; total: number }>()
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

/** Keep the participation list about the shares; the core has its own breakdown in «Роли». */
const roleLabel = (role: GroupParticipantDto['role']) => (role === 'anchor' ? undefined : t(`group.roles.${role}`))

/** Put a visible pattern into words, using the same shares as the list below. */
const finding = computed(() => {
  const { participants } = props.group
  const total = props.total
  if (total <= 0 || participants.length < 2) return null

  const counts = participants.map((person) => person.messageCount).sort((a, b) => b - a)
  const largest = counts[0]!
  const smallest = counts.at(-1)!
  const percent = (count: number) => formatPercent((100 * count) / total)
  if (counts.reduce((sum, count) => sum + count, 0) === total && largest < smallest * 1.25) {
    const from = percent(smallest)
    const to = percent(largest)
    return {
      answer: t('group.people.even'),
      detail: from === to ? t('group.people.sameShare', { share: from }) : t('group.people.range', { from, to }),
    }
  }

  let sum = 0
  const smallGroup = counts.slice(0, Math.min(3, Math.floor(counts.length / 2)))
  for (const [index, count] of smallGroup.entries()) {
    sum += count
    if (sum * 2 > total)
      return { answer: tc('group.people.majority', index + 1, { share: percent(sum) }), detail: null }
  }
  return null
})
</script>

<template>
  <div class="people" :class="{ 'people--solo': !selected }">
    <ReportSection id="part-people" :icon="Users" :title="t('group.people.title')" :answer="finding?.answer" hero>
      <p v-if="finding?.detail" class="people__detail t-label">{{ finding.detail }}</p>
      <div class="people__list">
        <template v-for="person in visible" :key="person.id">
          <UiListRow v-if="person.isSelf" wrap :title="nameOf(person)" :subtitle="roleLabel(person.role)">
            <template #leading><UiAvatar :title="nameOf(person)" side="mine" size="md" /></template>
            <template #trailing>
              <span class="people__share people__share--self tnum">{{ formatPercent(person.messageShare) }}</span>
            </template>
          </UiListRow>
          <UiListRow
            v-else
            as="button"
            chevron
            wrap
            :title="nameOf(person)"
            :subtitle="roleLabel(person.role)"
            :selected="wide && person.id === selected?.id"
            :aria-pressed="wide ? person.id === selected?.id : undefined"
            :aria-haspopup="wide ? undefined : 'dialog'"
            @click="open(person.id)"
          >
            <template #leading><UiAvatar :title="nameOf(person)" :seed="person.id" size="md" /></template>
            <template #trailing>
              <span class="people__share tnum">{{ formatPercent(person.messageShare) }}</span>
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

    <aside v-if="selected && wide" class="tile people__panel">
      <GroupMemberDetails
        :participant="selected"
        :group="group"
        :top-words="words?.members[selected.id]?.topWords ?? []"
      />
    </aside>
    <UiBottomSheet :open="!wide && sheetOpen" :title="t('group.member')" @close="sheetOpen = false">
      <GroupMemberDetails
        v-if="selected"
        :participant="selected"
        :group="group"
        :top-words="words?.members[selected.id]?.topWords ?? []"
      />
    </UiBottomSheet>
  </div>
</template>

<style scoped>
/* Rows reach the tile's text edge; the last one has no hairline. */
.people__list > :deep(:last-child .list-row__body) {
  box-shadow: none;
}

.people__detail {
  color: var(--text-muted);
}

.people__share {
  color: var(--text);
  font: var(--text-label);
}

/* Your own row has no chevron: the number stands where the others' numbers stand. */
.people__share--self {
  margin-right: calc(var(--icon-sm) + var(--space-3));
}

/* Desktop: the list card on the left, the member's card beside it, staying in view while the list scrolls (18.11:
   two cards side by side, as every pair of findings, instead of a card inside a card). */
@media (min-width: 901px) {
  .people:not(.people--solo) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    gap: var(--card-gap);
  }

  .people__panel {
    position: sticky;
    top: calc(var(--topbar-height) + var(--space-4));
    min-width: 0;
  }
}
</style>

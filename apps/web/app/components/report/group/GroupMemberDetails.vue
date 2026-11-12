<script setup lang="ts">
import type { GroupParticipantDto, GroupReportDto, TopItemDto } from '@tg-analyzer/shared'
import type { Fact } from '../ReportFacts.vue'

/**
 * One member of a group: who they are in the chat, their numbers as rows, the words they lean on and
 * the people they answer most. The same body in the phone sheet and in the desktop panel.
 */
/** `topWords`: the member's words from `derived.words.group`, only those used often enough to say something. */
const props = defineProps<{ participant: GroupParticipantDto; group: GroupReportDto; topWords: TopItemDto[] }>()
const { t, formatNumber, formatPercent, formatDate } = useI18n()
const nameOf = useParticipantName()

const facts = computed<Fact[]>(() => {
  const person = props.participant
  const out: Fact[] = [
    { key: 'messages', label: t('group.messages'), value: formatNumber(person.messageCount) },
    { key: 'starters', label: t('group.starters'), value: formatPercent(person.starterShare) },
    { key: 'replies', label: t('group.repliesReceived'), value: formatNumber(person.repliesReceived) },
  ]
  if (person.lastSeen)
    out.push({
      key: 'last',
      label: t('group.lastSeen'),
      value: formatDate(person.lastSeen, { day: 'numeric', month: 'long' }),
    })
  return out
})

const byId = computed(() => new Map(props.group.participants.map((person) => [person.id, person])))
/** The three people this member trades replies with most. */
const connections = computed(() =>
  props.group.topPairs
    .filter(
      (pair) => pair.leftParticipantId === props.participant.id || pair.rightParticipantId === props.participant.id,
    )
    .map((pair) => {
      const left = pair.leftParticipantId === props.participant.id
      const id = left ? pair.rightParticipantId : pair.leftParticipantId
      const person = byId.value.get(id) ?? {
        id,
        name: left ? pair.rightParticipantName : pair.leftParticipantName,
        isSelf: false,
      }
      return { person, score: pair.symmetricScore }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3),
)
</script>

<template>
  <div class="member">
    <header class="member__head">
      <UiAvatar :title="nameOf(participant)" :seed="participant.id" size="lg" />
      <div class="member__who">
        <h3 class="member__name">{{ nameOf(participant) }}</h3>
        <p class="member__role">
          {{
            t('group.memberLine', {
              role: t(`group.roles.${participant.role}`),
              share: formatPercent(participant.messageShare),
            })
          }}
        </p>
      </div>
    </header>

    <ReportFacts :facts="facts" />

    <section v-if="topWords.length" class="member__block">
      <h4 class="member__label">{{ t('group.topWords') }}</h4>
      <WordChips :items="topWords.slice(0, 6)" :counts="false" />
    </section>

    <section v-if="connections.length" class="member__block member__block--rows">
      <h4 class="member__label">{{ t('group.topConnections') }}</h4>
      <div class="member__rows">
        <UiListRow v-for="item in connections" :key="item.person.id" :title="nameOf(item.person)">
          <template #leading>
            <UiAvatar
              :title="nameOf(item.person)"
              :seed="item.person.id"
              :side="item.person.isSelf ? 'mine' : null"
              size="sm"
            />
          </template>
          <template #trailing
            ><span class="member__score">{{ formatNumber(item.score) }}</span></template
          >
        </UiListRow>
      </div>
    </section>
  </div>
</template>

<style scoped>
.member {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  min-width: 0;
}

.member__head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.member__who {
  min-width: 0;
}

.member__name {
  overflow: hidden;
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member__role,
.member__label {
  color: var(--text-muted);
  font: var(--text-label);
}

.member__block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.member__block--rows {
  gap: 0;
}

.member__rows > :deep(:last-child .list-row__body) {
  box-shadow: none;
}

.member__score {
  color: var(--text);
  font: var(--text-label);
}
</style>

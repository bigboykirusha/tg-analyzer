<script setup lang="ts">
import { formatVoiceDuration, type GroupParticipantDto, type GroupReportDto } from '@tg-analyzer/shared'

/**
 * «Роли»: who plays which part in the chat, at most six — who starts conversations, the star of the
 * reactions, who wakes the chat and who puts it to bed, the voice. One row per role: the winner's avatar,
 * the role, «Юля, 15% разговоров». The answer names whoever holds the most roles.
 */
const props = defineProps<{ group: GroupReportDto }>()
const { t, tc, locale, formatDecimal, formatPercent } = useI18n()

/** Reply magnets need a real sample: one message with two replies is not a magnet. */
const MIN_MAGNET_MESSAGES = 10
const nameOf = useParticipantName()

interface Role {
  key: string
  title: string
  winner: GroupParticipantDto
  value: string
}

const specs = computed(() => [
  {
    key: 'starter',
    title: t('group.awards.starter'),
    amount: (p: GroupParticipantDto) => p.starterShare,
    describe: (value: number) => t('group.awards.starterValue', { share: formatPercent(value) }),
  },
  {
    key: 'magnet',
    title: t('group.awards.magnet'),
    amount: (p: GroupParticipantDto) => (p.messageCount >= MIN_MAGNET_MESSAGES ? (p.magnetScore ?? 0) : 0),
    describe: (value: number) => t('group.awards.magnetValue', { value: formatDecimal(value) }),
  },
  {
    key: 'reactions',
    title: t('group.awards.reactions'),
    amount: (p: GroupParticipantDto) => p.reactionsReceived ?? 0,
    describe: (value: number) => tc('report.talk.reactionCount', value),
  },
  {
    key: 'morning',
    title: t('group.awards.morning'),
    amount: (p: GroupParticipantDto) => p.morningFirst ?? 0,
    describe: (value: number) => tc('group.awards.times', value),
  },
  {
    key: 'night',
    title: t('group.awards.night'),
    amount: (p: GroupParticipantDto) => p.nightLast ?? 0,
    describe: (value: number) => tc('group.awards.times', value),
  },
  {
    key: 'voice',
    title: t('group.awards.voice'),
    amount: (p: GroupParticipantDto) => (p.voiceSeconds ?? 0) + (p.roundSeconds ?? 0),
    describe: (value: number) => formatVoiceDuration(value, locale.value),
  },
])

const roles = computed(() =>
  specs.value
    .map((spec): Role | null => {
      const [first] = props.group.participants
        .filter((participant) => spec.amount(participant) > 0)
        .sort((left, right) => spec.amount(right) - spec.amount(left))
      return first
        ? { key: spec.key, title: spec.title, winner: first, value: spec.describe(spec.amount(first)) }
        : null
    })
    .filter((item): item is Role => item !== null),
)

/** «Больше всех ролей у Юли», or that the roles are shared out. */
const answer = computed(() => {
  const counts = new Map<string, { winner: GroupParticipantDto; n: number }>()
  for (const role of roles.value) {
    const entry = counts.get(role.winner.id) ?? { winner: role.winner, n: 0 }
    entry.n += 1
    counts.set(role.winner.id, entry)
  }
  const top = [...counts.values()].sort((a, b) => b.n - a.n)[0]
  return top && top.n > 1 ? t('group.roles.most', { name: nameOf(top.winner) }) : t('group.roles.shared')
})
</script>

<template>
  <ReportSection v-if="roles.length > 1" id="part-roles" :title="t('group.awards.title')" :answer="answer">
    <div class="roles">
      <UiListRow
        v-for="item in roles"
        :key="item.key"
        :title="item.title"
        :subtitle="t('group.awards.line', { name: nameOf(item.winner), value: item.value })"
      >
        <template #leading>
          <UiAvatar
            :title="nameOf(item.winner)"
            :seed="item.winner.id"
            :side="item.winner.isSelf ? 'mine' : null"
            size="sm"
          />
        </template>
      </UiListRow>
    </div>
  </ReportSection>
</template>

<style scoped>
.roles > :deep(:last-child .list-row__body) {
  box-shadow: none;
}
</style>

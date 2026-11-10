<script setup lang="ts">
import type { GroupParticipantDto, GroupReportDto } from '@tg-analyzer/shared'

/**
 * «Номинации»: who leads the group in each habit, one row per award — the winner's avatar, the award,
 * then «Юля, 15% разговоров».
 */
const props = defineProps<{ group: GroupReportDto }>()
const { t, tc, formatDecimal, formatDuration, formatPercent } = useI18n()
const nameOf = useParticipantName()

/** Reply magnets need a real sample: one message with two replies is not a magnet. */
const MIN_MAGNET_MESSAGES = 10

interface Award {
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
    describe: (value: number) => formatDuration(value),
  },
])

const awards = computed(() =>
  specs.value
    .map((spec): Award | null => {
      const ranked = props.group.participants
        .filter((participant) => spec.amount(participant) > 0)
        .sort((left, right) => spec.amount(right) - spec.amount(left))
      const [first] = ranked
      if (!first) return null
      return {
        key: spec.key,
        title: spec.title,
        winner: first,
        value: spec.describe(spec.amount(first)),
      }
    })
    .filter((item): item is Award => item !== null),
)
</script>

<template>
  <ReportSection v-if="awards.length" :title="t('group.awards.title')">
    <div class="awards">
      <UiListRow
        v-for="item in awards"
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
.awards > :deep(:last-child .list-row__body) {
  box-shadow: none;
}
</style>

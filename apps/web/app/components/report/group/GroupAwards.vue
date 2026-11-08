<script setup lang="ts">
import type { GroupParticipantDto, GroupReportDto } from '@tg-analyzer/shared'
import { hueOf } from '../../../lib/hue'

/**
 * «Номинации»: who leads the group in each habit, one row per award — the award, the winner's name in
 * their own colour (you in ink) and the value. Replaces a wall of near-identical ranking lists.
 */
const props = defineProps<{ group: GroupReportDto }>()
const { t, tc, formatDecimal, formatDuration, formatPercent } = useI18n()
const nameOf = useParticipantName()

/** Reply magnets need a real sample: one message with two replies is not a magnet. */
const MIN_MAGNET_MESSAGES = 10

interface Award {
  key: string
  title: string
  winner: string
  /** The winner's colour family; null for you (ink). */
  hue: string | null
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
        winner: nameOf(first),
        value: spec.describe(spec.amount(first)),
        hue: first.isSelf ? null : hueOf(first.id),
      }
    })
    .filter((item): item is Award => item !== null),
)
</script>

<template>
  <ReportSection v-if="awards.length" wide :title="t('group.awards.title')">
    <ul class="awards">
      <li v-for="item in awards" :key="item.key" class="award" :data-hue="item.hue ?? undefined">
        <span class="award__who">
          <span class="award__title">{{ item.title }}</span>
          <strong class="award__winner" :class="{ 'award__winner--you': !item.hue }">{{ item.winner }}</strong>
        </span>
        <span class="award__value t-num">{{ item.value }}</span>
      </li>
    </ul>
  </ReportSection>
</template>

<style scoped>
/* Rows divided by hairlines: the award and its winner on the left, the value on the right. */
.awards {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.award {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  min-width: 0;
  padding: var(--space-3) 0;
  box-shadow: var(--divider-top);
}

.award__who {
  display: grid;
  min-width: 0;
}

.award__title {
  color: var(--text-muted);
  font: var(--text-small);
}

.award__winner {
  overflow: hidden;
  color: var(--them-ink);
  font: var(--text-title);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.award__winner--you {
  color: var(--you);
}

.award__value {
  flex: none;
  color: var(--text-muted);
  font: var(--text-small);
}
</style>

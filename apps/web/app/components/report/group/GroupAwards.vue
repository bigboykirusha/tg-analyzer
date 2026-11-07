<script setup lang="ts">
import type { GroupParticipantDto, GroupReportDto } from '@tg-analyzer/shared'

/**
 * «Номинации»: who leads the group in each habit, one tile per award, with the next two
 * names underneath. Replaces a wall of near-identical ranking lists.
 */
const props = defineProps<{ group: GroupReportDto; insights: string[] }>()
const { t, tc, formatDecimal, formatDuration, formatPercent } = useI18n()
const nameOf = useParticipantName()

/** Reply magnets need a real sample: one message with two replies is not a magnet. */
const MIN_MAGNET_MESSAGES = 10

interface Award {
  key: string
  title: string
  winner: string
  value: string
  self: boolean
  next: string[]
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
    describe: (value: number) => tc('report.talk.mornings', value),
  },
  {
    key: 'night',
    title: t('group.awards.night'),
    amount: (p: GroupParticipantDto) => p.nightLast ?? 0,
    describe: (value: number) => tc('report.talk.evenings', value),
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
      const [first, ...rest] = ranked
      if (!first) return null
      return {
        key: spec.key,
        title: spec.title,
        winner: nameOf(first),
        value: spec.describe(spec.amount(first)),
        self: first.isSelf,
        next: rest.slice(0, 2).map((participant) => nameOf(participant)),
      }
    })
    .filter((item): item is Award => item !== null),
)
</script>

<template>
  <ReportSection v-if="awards.length" wide :title="t('group.awards.title')" :text="insights.join(' ')">
    <ul class="awards">
      <li v-for="item in awards" :key="item.key" class="award">
        <span class="award__title">{{ item.title }}</span>
        <strong class="award__winner">{{ item.winner }}</strong>
        <span class="award__value t-num">{{ item.value }}</span>
        <span v-if="item.next.length" class="award__next">
          {{ t('group.awards.next', { names: item.next.join(', ') }) }}
        </span>
      </li>
    </ul>
  </ReportSection>
</template>

<style scoped>
/* Six titles in a grid of cells divided by hairlines: no wells, no icons, the winner's name first. */
.awards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  list-style: none;
}

.award {
  display: grid;
  align-content: start;
  gap: var(--space-1);
  min-width: 0;
  padding: var(--space-4) var(--space-6) var(--space-4) var(--space-6);
  box-shadow: var(--divider-left), var(--divider-top);
}

.award:nth-child(3n + 1) {
  padding-left: 0;
  box-shadow: var(--divider-top);
}

.award:nth-child(-n + 3) {
  box-shadow: var(--divider-left);
}

.award:first-child {
  box-shadow: none;
}

.award__title {
  color: var(--text-muted);
  font: var(--text-small);
}

.award__winner {
  overflow: hidden;
  font: var(--text-h3);
  letter-spacing: var(--tracking-h3);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.award__value {
  color: var(--them-ink);
  font: var(--text-ui);
}

.award__next {
  overflow: hidden;
  color: var(--text-muted);
  font: var(--text-small);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Two per row below 900 px; the hairlines follow the new rows. */
@media (max-width: 900px) {
  .awards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .award,
  .award:nth-child(3n + 1),
  .award:nth-child(-n + 3) {
    padding: var(--space-4) 0 var(--space-4) var(--space-4);
    box-shadow: var(--divider-left), var(--divider-top);
  }

  .award:nth-child(odd) {
    padding-left: 0;
    box-shadow: var(--divider-top);
  }

  .award:nth-child(2) {
    box-shadow: var(--divider-left);
  }

  .award:first-child {
    box-shadow: none;
  }

  .award__next {
    white-space: normal;
  }
}

@media (max-width: 340px) {
  .awards {
    grid-template-columns: minmax(0, 1fr);
  }

  .award,
  .award:nth-child(odd),
  .award:nth-child(2) {
    padding-left: 0;
    box-shadow: var(--divider-top);
  }

  .award:first-child {
    box-shadow: none;
  }
}
</style>

<script setup lang="ts">
import type { Component } from 'vue'
import type { GroupParticipantDto, GroupReportDto } from '@tg-analyzer/shared'
import { Heart, Magnet, Megaphone, Mic, MoonStar, Sunrise } from '../../../lib/icons'

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
  icon: Component
  title: string
  winner: string
  value: string
  self: boolean
  next: string[]
}

const specs = computed(() => [
  {
    key: 'starter',
    icon: Megaphone,
    title: t('group.awards.starter'),
    amount: (p: GroupParticipantDto) => p.starterShare,
    describe: (value: number) => t('group.awards.starterValue', { share: formatPercent(value) }),
  },
  {
    key: 'magnet',
    icon: Magnet,
    title: t('group.awards.magnet'),
    amount: (p: GroupParticipantDto) => (p.messageCount >= MIN_MAGNET_MESSAGES ? (p.magnetScore ?? 0) : 0),
    describe: (value: number) => t('group.awards.magnetValue', { value: formatDecimal(value) }),
  },
  {
    key: 'reactions',
    icon: Heart,
    title: t('group.awards.reactions'),
    amount: (p: GroupParticipantDto) => p.reactionsReceived ?? 0,
    describe: (value: number) => tc('report.talk.reactionCount', value),
  },
  {
    key: 'morning',
    icon: Sunrise,
    title: t('group.awards.morning'),
    amount: (p: GroupParticipantDto) => p.morningFirst ?? 0,
    describe: (value: number) => tc('report.talk.mornings', value),
  },
  {
    key: 'night',
    icon: MoonStar,
    title: t('group.awards.night'),
    amount: (p: GroupParticipantDto) => p.nightLast ?? 0,
    describe: (value: number) => tc('report.talk.evenings', value),
  },
  {
    key: 'voice',
    icon: Mic,
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
        icon: spec.icon,
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
  <ReportSection v-if="awards.length" wide tone="ink" :title="t('group.awards.title')" :text="insights.join(' ')">
    <ul class="awards">
      <li v-for="item in awards" :key="item.key" class="award">
        <span class="award__title">
          <component :is="item.icon" aria-hidden="true" />
          {{ item.title }}
        </span>
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
.awards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--card-gap);
  list-style: none;
}

.award {
  display: grid;
  align-content: start;
  gap: var(--space-1);
  min-width: 0;
  padding: var(--space-4);
  border-radius: var(--radius-md);
  background: var(--surface-2);
}

.award__title {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  color: var(--text-muted);
  font: var(--text-label);
}

.award__winner {
  overflow: hidden;
  font: var(--text-h3);
  letter-spacing: var(--tracking-h3);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.award__value {
  color: var(--them);
  font: var(--text-ui);
}

.award__next {
  overflow: hidden;
  margin-top: var(--space-2);
  color: var(--text-muted);
  font: var(--text-small);
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .awards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

/* Phones keep two awards per row, so six of them stay one screen tall. */
@media (max-width: 640px) {
  .award {
    padding: var(--space-3);
  }

  .award__title {
    align-items: flex-start;
    font: var(--text-caption);
  }

  .award__winner {
    font: var(--text-title);
  }

  .award__value,
  .award__next {
    font: var(--text-caption);
  }

  .award__next {
    white-space: normal;
  }
}

@media (max-width: 340px) {
  .awards {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

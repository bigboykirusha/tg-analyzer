<script setup lang="ts">
import type { GroupReportDto } from '@tg-analyzer/shared'
import { hueOf } from '../../../lib/hue'

/**
 * How the group holds together. «Самые плотные пары» (card 24): the closest pair is the answer, the
 * others are only names. «Кто держит разговор» (card 25, instead of the old health meters): a hundred
 * dots, each a hundredth of the messages, in each member's colour, the biggest voices first.
 */
const props = defineProps<{ group: GroupReportDto }>()
const { t, tc, formatNumber } = useI18n()
const nameOf = useParticipantName()
const pairName = usePairNames(() => props.group)

const byId = computed(() => new Map(props.group.participants.map((participant) => [participant.id, participant])))
/** A name in its person's colour; «вы» in ink. */
const person = (id: string, fallback: string) => {
  const participant = byId.value.get(id)
  return { name: pairName(id, fallback), hue: participant?.isSelf ? null : hueOf(id) }
}

const pairs = computed(() =>
  props.group.topPairs.map((pair) => ({
    key: `${pair.leftParticipantId}-${pair.rightParticipantId}`,
    left: person(pair.leftParticipantId, pair.leftParticipantName),
    right: person(pair.rightParticipantId, pair.rightParticipantName),
  })),
)

/** Members who get a colour of their own in the dots; everyone else shares the quiet grey. */
const NAMED = 4
const voices = computed(() => {
  const ranked = [...props.group.participants].sort((a, b) => b.messageCount - a.messageCount)
  const named = ranked.slice(0, NAMED).map((participant) => ({
    key: participant.id,
    name: nameOf(participant),
    hue: participant.isSelf ? null : hueOf(participant.id),
    self: participant.isSelf,
    share: participant.messageShare,
  }))
  const rest = ranked.slice(NAMED)
  const restShare = Math.max(0, 100 - named.reduce((sum, item) => sum + item.share, 0))
  // A hundred dots: each named member gets their rounded share, the rest fill what is left.
  const dots: { key: string; hue: string | null; self: boolean; rest: boolean }[] = []
  for (const item of named)
    for (let at = 0; at < Math.round(item.share) && dots.length < 100; at += 1)
      dots.push({ key: `${item.key}-${at}`, hue: item.hue, self: item.self, rest: false })
  while (dots.length < 100) dots.push({ key: `rest-${dots.length}`, hue: null, self: false, rest: true })
  const half = named.findIndex((_, index) => named.slice(0, index + 1).reduce((sum, item) => sum + item.share, 0) >= 50)
  const answer =
    half === 0
      ? t('group.voices.one', { name: named[0]!.name })
      : half === 1
        ? t('group.voices.two')
        : half === 2
          ? t('group.voices.three')
          : t('group.voices.even')
  return { named, rest: rest.length, restShare, dots, answer }
})
</script>

<template>
  <div class="report-grid">
    <ReportSection v-if="pairs.length" :title="t('group.networkTitle')">
      <div class="pairs">
        <p class="pairs__lead">
          <span class="pairs__names">
            <b :data-hue="pairs[0]!.left.hue ?? undefined" :class="{ you: !pairs[0]!.left.hue }">{{
              pairs[0]!.left.name
            }}</b>
            {{ t('report.headline.and').trim() }}
            <b :data-hue="pairs[0]!.right.hue ?? undefined" :class="{ you: !pairs[0]!.right.hue }">{{
              pairs[0]!.right.name
            }}</b>
          </span>
          <span class="pairs__note">{{ t('group.pairs.lead') }}</span>
        </p>
        <p v-for="pair in pairs.slice(1)" :key="pair.key" class="pairs__row">
          <b :data-hue="pair.left.hue ?? undefined" :class="{ you: !pair.left.hue }">{{ pair.left.name }}</b>
          {{ t('report.headline.and').trim() }}
          <b :data-hue="pair.right.hue ?? undefined" :class="{ you: !pair.right.hue }">{{ pair.right.name }}</b>
        </p>
      </div>
    </ReportSection>

    <ReportSection v-if="group.participants.length > 1" :title="t('group.voices.title')" :answer="voices.answer">
      <div
        class="voices"
        role="img"
        :aria-label="voices.named.map((item) => `${item.name} ${Math.round(item.share)}%`).join(', ')"
      >
        <i
          v-for="dot in voices.dots"
          :key="dot.key"
          class="voices__dot"
          :class="{ 'voices__dot--you': dot.self, 'voices__dot--rest': dot.rest }"
          :data-hue="dot.hue ?? undefined"
        />
      </div>
      <ul class="voices__legend" aria-hidden="true">
        <li v-for="item in voices.named" :key="item.key" :data-hue="item.hue ?? undefined">
          <i class="voices__dot" :class="{ 'voices__dot--you': item.self }" />{{ item.name }}
          <span class="t-num">{{ Math.round(item.share) }}</span>
        </li>
        <li v-if="voices.rest">
          <i class="voices__dot voices__dot--rest" />{{ tc('group.voices.rest', voices.rest) }}
          <span class="t-num">{{ formatNumber(Math.round(voices.restShare)) }}</span>
        </li>
      </ul>
    </ReportSection>
  </div>
</template>

<style scoped>
.pairs {
  display: grid;
}

.pairs b {
  color: var(--them-ink);
  font-weight: 600;
}

.pairs b.you {
  color: var(--you);
}

.pairs__lead {
  display: grid;
  gap: var(--space-0-5);
  padding-bottom: var(--space-3);
}

.pairs__names {
  font: var(--text-h2);
  letter-spacing: var(--tracking-h2);
}

.pairs__note {
  color: var(--text-muted);
  font: var(--text-small);
}

.pairs__row {
  padding: var(--space-3) 0;
  box-shadow: var(--divider-top);
  font: var(--text-title);
}

/* A hundred dots in ten rows: each is a hundredth of the messages, in its writer's colour. */
.voices {
  display: grid;
  grid-template-columns: repeat(20, minmax(0, 1fr));
  gap: var(--space-1);
}

.voices__dot {
  display: inline-block;
  aspect-ratio: 1;
  min-width: var(--space-2);
  border-radius: var(--radius-full);
  background: var(--them);
}

.voices__dot--you {
  background: var(--you);
}

.voices__dot--rest {
  background: var(--chart-neutral);
}

.voices__legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-4);
  margin: 0;
  padding: 0;
  color: var(--text);
  font: var(--text-small);
  list-style: none;
}

.voices__legend li {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.voices__legend .voices__dot {
  width: var(--space-2);
}

.voices__legend span {
  color: var(--text-muted);
}
</style>

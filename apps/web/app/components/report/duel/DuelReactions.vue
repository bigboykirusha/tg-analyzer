<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import type { Versus } from '../../../composables/useVersus'

/**
 * Reactions: each side's three favourites over a podium — first place in the middle and taller, as on
 * a real one, the emoji above its step and the place inside it. The first step is the side's ink
 * (yours black, theirs their colour), the other two quiet. Under it, whose podium it is.
 */
const props = defineProps<{ data: ReportDto; item: Versus | null }>()
const { t } = useI18n()
const name = computed(() => props.data.summary.title)

// Custom emoji have no picture here, so only regular ones are shown.
const plain = (items: { value: string; count: number }[]) =>
  items.filter((entry) => entry.value !== 'custom' && entry.value !== 'paid').slice(0, 3)

const sides = computed(() => {
  const stats = props.data.report.reactions
  if (!stats) return []
  return [
    { key: 'mine' as const, who: t('report.reactions.mine'), items: plain(stats.topBySender.mine) },
    { key: 'theirs' as const, who: name.value, items: plain(stats.topBySender.theirs) },
  ]
    .filter((side) => side.items.length)
    .map((side) => {
      const [first, second, third] = side.items
      const steps = [
        second && { ...second, place: 2 },
        first && { ...first, place: 1 },
        third && { ...third, place: 3 },
      ].filter((entry): entry is { value: string; count: number; place: number } => Boolean(entry))
      return { ...side, top: first?.value ?? null, steps }
    })
})

/** «Ставите поровну, любимые — разные»: who reacts more, then whether the favourite is the same. */
const answer = computed(() => {
  const item = props.item
  const parts: string[] = []
  if (item) {
    const mine = item.lead === 'mine'
    if (!item.lead) parts.push(t('report.reactions.answer.even'))
    else if (!Number.isFinite(item.ratio))
      parts.push(
        mine ? t('report.reactions.answer.onlyMine') : t('report.reactions.answer.onlyTheirs', { name: name.value }),
      )
    else
      parts.push(
        mine
          ? t('report.reactions.answer.mine', { note: item.note })
          : t('report.reactions.answer.theirs', { name: name.value, note: item.note }),
      )
  }
  const [mine, theirs] = sides.value
  if (mine?.top && theirs?.top)
    parts.push(
      mine.top === theirs.top ? t('report.reactions.same', { emoji: mine.top }) : t('report.reactions.different'),
    )
  return parts.length ? parts.join(', ') : null
})
</script>

<template>
  <ReportSection v-if="sides.length" :title="t('report.talk.reactionsTitle')" :answer="answer">
    <div class="podiums">
      <div v-for="side in sides" :key="side.key" class="podium-side" :class="`podium-side--${side.key}`">
        <div class="podium__emojis" aria-hidden="true">
          <span v-for="step in side.steps" :key="step.value" :class="{ 'podium__emoji--first': step.place === 1 }">
            {{ step.value }}
          </span>
        </div>
        <ol class="podium">
          <li
            v-for="step in side.steps"
            :key="step.value"
            class="podium__step t-num"
            :class="`podium__step--${step.place}`"
          >
            {{ step.place }}<span class="sr-only">: {{ step.value }}</span>
          </li>
        </ol>
        <span class="podium__who">{{ side.who }}</span>
      </div>
    </div>
  </ReportSection>
</template>

<style scoped>
.podiums {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-4);
}

.podium-side {
  display: grid;
  justify-items: center;
  align-content: end;
  gap: var(--space-2);
  min-width: 0;
}

.podium,
.podium__emojis {
  display: flex;
  align-items: flex-end;
  gap: var(--space-1);
  width: 100%;
  max-width: calc(var(--space-12) * 3);
  margin: 0;
  padding: 0;
  list-style: none;
}

/* The three favourites in one row over their steps, the winner a size larger. */
.podium__emojis span {
  flex: 1;
  min-width: 0;
  font-size: var(--emoji-size);
  line-height: 1;
  text-align: center;
}

.podium__emojis .podium__emoji--first {
  font-size: var(--emoji-size-lg);
}

/* Steps of a real podium: the winner tallest, second and third lower. */
.podium__step {
  display: grid;
  flex: 1;
  place-items: start center;
  min-width: 0;
  height: var(--space-12);
  padding-top: var(--space-1);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  background: var(--surface-2);
  color: var(--text);
  font: var(--text-small);
  font-weight: 600;
}

.podium__step--1 {
  height: calc(var(--space-16) + var(--space-3));
  background: var(--you);
  color: var(--on-you);
}

.podium__step--3 {
  height: calc(var(--space-8) + var(--space-1));
}

.podium-side--theirs .podium__step {
  background: var(--room-tint);
}

.podium-side--theirs .podium__step--1 {
  background: var(--them);
  color: var(--on-them);
}

.podium__who {
  max-width: 100%;
  overflow: hidden;
  color: var(--text-muted);
  font: var(--text-small);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.podium-side--theirs .podium__who {
  color: var(--them-ink);
}
</style>

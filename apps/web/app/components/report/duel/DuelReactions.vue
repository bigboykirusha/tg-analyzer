<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import type { Versus } from '../../../composables/useVersus'

/**
 * Reactions: each side's three favourites on a podium (first place in the middle, as on a real
 * one), the side named by its avatar above, and both totals as one line at the foot.
 */
const props = defineProps<{ data: ReportDto; item: Versus | null }>()
const { t, formatNumber } = useI18n()
const name = computed(() => props.data.summary.title)

// Custom emoji have no picture here, so only regular ones are shown.
const plain = (items: { value: string; count: number }[]) =>
  items.filter((entry) => entry.value !== 'custom' && entry.value !== 'paid').slice(0, 3)

const sides = computed(() => {
  const stats = props.data.report.reactions
  if (!stats) return []
  return [
    { key: 'mine' as const, who: t('report.you'), items: plain(stats.topBySender.mine) },
    { key: 'theirs' as const, who: name.value, items: plain(stats.topBySender.theirs) },
  ]
    .filter((side) => side.items.length)
    .map((side) => {
      const top = side.items[0]!.count
      const [first, second, third] = side.items
      const steps = [second, first, third]
        .filter((entry): entry is { value: string; count: number } => Boolean(entry))
        .map((entry) => ({
          ...entry,
          place: entry === first ? 1 : entry === second ? 2 : 3,
          height: 32 + (entry.count / top) * 48,
        }))
      return { ...side, steps }
    })
})
const answer = computed(() => {
  const item = props.item
  if (!item) return null
  return item.lead ? `${item.figure} — ${item.note}` : t('report.fmt.reactionsEven')
})
</script>

<template>
  <ReportSection v-if="sides.length" :title="item?.title ?? t('report.talk.reactionsTitle')" :answer="answer">
    <div class="podiums">
      <div v-for="side in sides" :key="side.key" class="podium-side">
        <ReportSideAvatar :side="side.key" :name="side.who" />
        <div class="podium">
          <div v-for="step in side.steps" :key="step.value" class="podium__place">
            <span class="podium__emoji">{{ step.value }}</span>
            <span class="podium__count">{{ formatNumber(step.count) }}</span>
            <b class="podium__step" :class="`podium__step--${side.key}`" :style="{ height: `${step.height}px` }">
              {{ step.place }}
            </b>
          </div>
        </div>
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
  align-content: end;
  gap: var(--space-2);
  min-width: 0;
}

.podium {
  display: flex;
  align-items: flex-end;
  gap: var(--space-1);
}

.podium__place {
  display: grid;
  flex: 1;
  justify-items: center;
  gap: var(--space-1);
  min-width: 0;
}

.podium__emoji {
  font-size: var(--emoji-size);
  line-height: 1;
}

.podium__count {
  color: var(--text-muted);
  font: var(--text-small);
}

.podium__step {
  display: grid;
  place-items: start center;
  width: 100%;
  padding-top: var(--space-2);
  border-radius: var(--radius-mark) var(--radius-mark) 0 0;
  font: var(--text-title);
}

.podium__step--mine {
  background: var(--you);
  color: var(--surface);
}

.podium__step--theirs {
  background: var(--them);
  color: var(--surface);
}
</style>

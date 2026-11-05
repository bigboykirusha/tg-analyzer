<script setup lang="ts">
import type { ReportDto } from '@tg-analyzer/shared'
import type { Versus } from '../../../composables/useVersus'

/**
 * Reactions: both totals as one line, then each side's favourites on a podium — the first
 * place in the middle, as on a real one — and the next three in a quiet row under it.
 */
const props = defineProps<{ data: ReportDto; item: Versus | null }>()
const { t, formatNumber } = useI18n()
const name = computed(() => props.data.summary.title)

// Custom emoji have no picture here, so only regular ones are shown.
const plain = (items: { value: string; count: number }[]) =>
  items.filter((entry) => entry.value !== 'custom' && entry.value !== 'paid').slice(0, 6)

const sides = computed(() => {
  const stats = props.data.report.reactions
  if (!stats) return []
  const lists = [
    { key: 'mine', label: t('report.fmt.podiumMine'), items: plain(stats.topBySender.mine) },
    {
      key: 'theirs',
      label: t('report.fmt.podiumTheirs', { name: name.value }),
      items: plain(stats.topBySender.theirs),
    },
  ]
  return lists
    .filter((side) => side.items.length)
    .map((side) => {
      const top = side.items[0]!.count
      const [first, second, third] = side.items
      const steps = [second, first, third]
        .filter((entry): entry is { value: string; count: number } => Boolean(entry))
        .map((entry) => ({
          ...entry,
          place: entry === first ? 1 : entry === second ? 2 : 3,
          height: 28 + (entry.count / top) * 52,
        }))
      return { ...side, steps }
    })
})
const pair = computed(() => props.item?.pairs[0] ?? null)
</script>

<template>
  <ReportSection v-if="sides.length" tone="lime" :title="item?.title ?? t('report.talk.reactionsTitle')">
    <div v-if="item && pair" class="lead">
      <p class="lead__figure t-num">
        {{ pair.mine.text }} <small>{{ t('report.fmt.against', { value: pair.theirs.text }) }}</small>
      </p>
      <p class="lead__note">
        {{ item.lead ? `${item.figure} — ${item.note}` : t('report.fmt.reactionsEven') }}
      </p>
    </div>
    <div class="podiums">
      <div v-for="side in sides" :key="side.key" class="podium-side">
        <span class="podium-side__label">{{ side.label }}</span>
        <div class="podium" :class="`podium--${side.key}`">
          <div v-for="step in side.steps" :key="step.value" class="podium__place">
            <span class="podium__emoji">{{ step.value }}</span>
            <b class="podium__step t-num" :style="{ height: `${step.height}px` }">{{ formatNumber(step.count) }}</b>
          </div>
        </div>
      </div>
    </div>
  </ReportSection>
</template>

<style scoped>
.lead {
  display: grid;
  gap: var(--space-1);
}

.lead__figure {
  font: var(--text-figure);
  letter-spacing: var(--tracking-figure);
}

.lead__figure small {
  color: var(--text-muted);
  font: var(--text-h3);
  letter-spacing: 0;
}

.lead__note {
  font: var(--text-ui);
}

.podiums {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5);
  margin-top: auto;
}

.podium-side {
  display: grid;
  align-content: end;
  gap: var(--space-2);
  min-width: 0;
}

.podium-side__label {
  overflow: hidden;
  color: var(--text-muted);
  font: var(--text-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.podium {
  display: flex;
  align-items: flex-end;
  gap: 4px;
}

.podium__place {
  display: grid;
  flex: 1;
  justify-items: center;
  gap: var(--space-1);
  min-width: 0;
}

.podium__emoji {
  font-size: 28px;
  line-height: 1.1;
}

.podium__step {
  display: grid;
  place-items: start center;
  width: 100%;
  padding-top: var(--space-2);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  font: var(--text-ui);
  font-weight: 500;
}

.podium--mine .podium__step {
  background: var(--on-lime);
  color: var(--lime);
}

.podium--theirs .podium__step {
  background: var(--on-lime-well);
  color: var(--on-lime);
}
</style>

<script setup lang="ts">
import type { Versus } from '../../../composables/useVersus'

/**
 * Who starts a conversation as a tug of war: the knot moves from the middle towards whoever
 * starts more often, on a scale of ticks every five percent, so a small lead still shows.
 */
const props = defineProps<{ item: Versus; theirName: string }>()
const { t, formatDecimal } = useI18n()

const pair = computed(() => props.item.pairs[0]!)
/** Your share, 0–100. */
const mine = computed(() => pair.value.mine.value)

const W = 320
const LEFT = 36
const RIGHT = W - 36
/** The knot: 0 % of yours puts it at the right end (the other side pulled it all). */
const knot = computed(() => LEFT + ((100 - mine.value) / 100) * (RIGHT - LEFT))
const ticks = Array.from({ length: 21 }, (_, index) => LEFT + (index / 20) * (RIGHT - LEFT))

const verdict = computed(() => {
  const { lead, ratio } = props.item
  if (!lead) {
    if (Math.abs(mine.value - 50) < 1) return t('report.fmt.startsTie')
    return t(mine.value > 50 ? 'report.fmt.startsEvenMine' : 'report.fmt.startsEvenTheirs', { name: props.theirName })
  }
  return t(lead === 'mine' ? 'report.fmt.startsMine' : 'report.fmt.startsTheirs', {
    name: props.theirName,
    ratio: formatDecimal(ratio),
  })
})
</script>

<template>
  <ReportSection :title="item.title">
    <div class="rope">
      <svg
        :viewBox="`0 0 ${W} 96`"
        class="rope__svg"
        role="img"
        :aria-label="`${pair.mine.text} / ${pair.theirs.text}`"
      >
        <line
          v-for="(x, index) in ticks"
          :key="index"
          :x1="x"
          :x2="x"
          :y1="index === 10 ? 14 : 34"
          :y2="index === 10 ? 82 : 40"
          class="rope__tick"
          :class="{ 'rope__tick--mid': index === 10 }"
        />
        <path :d="`M${LEFT} 52 Q ${W / 4} 46 ${W / 2} 52 T ${RIGHT} 52`" class="rope__line" />
        <rect :x="knot - 6" y="40" width="12" height="24" rx="4" class="rope__knot" />
        <circle :cx="LEFT - 14" cy="52" r="14" class="rope__end rope__end--mine" />
        <circle :cx="RIGHT + 14" cy="52" r="14" class="rope__end rope__end--theirs" />
      </svg>
      <div class="rope__sides">
        <div>
          <span class="rope__value t-num">{{ pair.mine.text }}</span>
          <span class="rope__who">{{ t('report.you') }}</span>
        </div>
        <div class="rope__right">
          <span class="rope__value t-num">{{ pair.theirs.text }}</span>
          <span class="rope__who">{{ theirName }}</span>
        </div>
      </div>
      <p class="rope__verdict">{{ verdict }}</p>
    </div>
  </ReportSection>
</template>

<style scoped>
.rope {
  display: grid;
  gap: var(--space-3);
  margin-top: auto;
}

.rope__svg {
  width: 100%;
  overflow: visible;
}

.rope__tick {
  stroke: var(--border-strong);
  stroke-width: 1.5;
}

.rope__tick--mid {
  stroke: var(--text-muted);
  stroke-dasharray: 3 4;
}

.rope__line {
  fill: none;
  stroke: var(--text-muted);
  stroke-width: 5;
  stroke-linecap: round;
}

.rope__knot {
  fill: var(--text);
}

.rope__end--mine {
  fill: var(--you);
}

.rope__end--theirs {
  fill: var(--them);
}

.rope__sides {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}

.rope__sides div {
  display: grid;
  min-width: 0;
}

.rope__right {
  text-align: right;
}

.rope__value {
  font: var(--text-figure-sm);
}

.rope__who {
  overflow: hidden;
  color: var(--text-muted);
  font: var(--text-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rope__verdict {
  font: var(--text-title);
}
</style>

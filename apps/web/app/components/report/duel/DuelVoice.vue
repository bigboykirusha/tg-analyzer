<script setup lang="ts">
import type { Versus } from '../../../composables/useVersus'

/** Voice as sound tracks: each side's wave is as long as it talked, voice messages and video notes together. */
const props = defineProps<{ item: Versus; theirName: string }>()
const { t, formatDuration } = useI18n()

const BARS = 64
/** Fixed heights that repeat like speech; the same track is cut shorter for the quieter side. */
const HEIGHTS = Array.from(
  { length: BARS },
  (_, index) => 22 + Math.round(78 * Math.abs(Math.sin(index * 1.7) * Math.cos(index * 0.45))),
)

/** Voice messages and video notes together: one track per side, as long as that side talked. */
const rows = computed(() => {
  const total = (key: 'mine' | 'theirs') => props.item.pairs.reduce((sum, pair) => sum + pair[key].value, 0)
  const mine = total('mine')
  const theirs = total('theirs')
  const max = Math.max(mine, theirs) || 1
  const row = (key: 'mine' | 'theirs', who: string, value: number) => ({
    key,
    who,
    text: formatDuration(value),
    bars: HEIGHTS.slice(0, value ? Math.max(2, Math.round((value / max) * BARS)) : 0),
  })
  // You first, as in every comparison of the report.
  return [row('mine', t('report.you'), mine), row('theirs', props.theirName, theirs)]
})
</script>

<template>
  <ReportSection :title="item.title">
    <p class="verdict">{{ item.lead ? `${item.figure} — ${item.note}` : t('report.fmt.voiceEven') }}</p>
    <div class="track">
      <div v-for="row in rows" :key="row.key" class="wave">
        <span class="wave__who t-num">{{ row.who }} · {{ row.text }}</span>
        <span class="wave__bars" :class="`wave__bars--${row.key}`" aria-hidden="true">
          <i v-for="(height, index) in row.bars" :key="index" :style="{ height: `${height}%` }" />
        </span>
      </div>
    </div>
  </ReportSection>
</template>

<style scoped>
.verdict {
  font: var(--text-figure-sm);
  letter-spacing: var(--tracking-h3);
}

.track {
  display: grid;
  gap: var(--space-3);
}

.wave {
  display: grid;
  gap: var(--space-1);
}

.wave__who {
  overflow: hidden;
  color: var(--text-muted);
  font: var(--text-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wave__bars {
  display: grid;
  grid-template-columns: repeat(64, minmax(0, 1fr));
  align-items: center;
  gap: 2px;
  height: 32px;
}

.wave__bars i {
  border-radius: var(--radius-full);
}

.wave__bars--mine i {
  background: var(--you);
}

.wave__bars--theirs i {
  background: var(--them);
}
</style>

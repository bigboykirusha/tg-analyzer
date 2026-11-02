<script setup lang="ts">
import type { Versus } from '../../../composables/useVersus'

/** Voice messages and video notes as sound tracks: each side's wave is as long as it talked. */
const props = defineProps<{ item: Versus; theirName: string }>()
const { t } = useI18n()

const BARS = 64
/** Fixed heights that repeat like speech; the same track is cut shorter for the quieter side. */
const HEIGHTS = Array.from(
  { length: BARS },
  (_, index) => 22 + Math.round(78 * Math.abs(Math.sin(index * 1.7) * Math.cos(index * 0.45))),
)

const tracks = computed(() =>
  props.item.pairs.map((pair) => {
    const max = Math.max(pair.mine.value, pair.theirs.value) || 1
    const row = (key: 'mine' | 'theirs', who: string) => ({
      key,
      who,
      text: pair[key].text,
      bars: HEIGHTS.slice(0, pair[key].value ? Math.max(2, Math.round((pair[key].value / max) * BARS)) : 0),
    })
    return { key: pair.key, label: pair.label, rows: [row('theirs', props.theirName), row('mine', t('report.you'))] }
  }),
)
</script>

<template>
  <ReportSection :title="item.title">
    <p class="verdict">{{ item.lead ? `${item.figure} — ${item.note}` : t('report.fmt.voiceEven') }}</p>
    <div v-for="track in tracks" :key="track.key" class="track">
      <span v-if="tracks.length > 1" class="track__label">{{ track.label }}</span>
      <div v-for="row in track.rows" :key="row.key" class="wave">
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
  letter-spacing: -0.02em;
}

.track {
  display: grid;
  gap: var(--space-3);
}

.track__label {
  font: var(--text-label);
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

<script setup lang="ts">
/**
 * One «Итоги» story slide. Purely presentational so the same slide renders on
 * screen (any size) and off screen at 9:16 for the exported image. Every size
 * is in cqmin, so the layout scales with the slide.
 */
export interface StoryStat {
  label: string
  value: string
}

export interface StorySlideModel {
  key: string
  /** 1–5: which --story-gradient-N paints the slide. */
  theme: 1 | 2 | 3 | 4 | 5
  kicker: string
  title: string
  sub?: string
  stats?: StoryStat[]
  /** Your share 0–100 with labels for both sides. */
  split?: { mine: number; mineLabel: string; theirsLabel: string }
  /** 24 hourly values; `highlight` is the peak hour. */
  bars?: { values: number[]; highlight: number }
  columns?: { left: { title: string; items: string[] }; right: { title: string; items: string[] } }
  emoji?: string[]
}

defineProps<{ slide: StorySlideModel; mine: string; theirs: string }>()

const initial = (name: string) => Array.from(name.trim())[0]?.toLocaleUpperCase() ?? '?'
</script>

<template>
  <div class="story-slide" :class="`story-slide--${slide.theme}`">
    <span class="story-slide__blob story-slide__blob--a" aria-hidden="true" />
    <span class="story-slide__blob story-slide__blob--b" aria-hidden="true" />

    <header class="story-slide__people">
      <span class="story-slide__face">{{ initial(mine) }}</span>
      <span class="story-slide__face story-slide__face--them">{{ initial(theirs) }}</span>
      <span class="story-slide__names">{{ mine }} × {{ theirs }}</span>
    </header>

    <div class="story-slide__body">
      <span class="story-slide__kicker">{{ slide.kicker }}</span>
      <strong class="story-slide__title" :class="{ 'story-slide__title--long': slide.title.length > 10 }">
        {{ slide.title }}
      </strong>
      <p v-if="slide.sub" class="story-slide__sub">{{ slide.sub }}</p>

      <div v-if="slide.split" class="story-slide__split">
        <div class="story-slide__split-bar">
          <span :style="{ width: `${slide.split.mine}%` }" />
        </div>
        <div class="story-slide__split-labels">
          <span>{{ slide.split.mineLabel }}</span>
          <span>{{ slide.split.theirsLabel }}</span>
        </div>
      </div>

      <div v-if="slide.bars" class="story-slide__bars" aria-hidden="true">
        <span
          v-for="(value, hour) in slide.bars.values"
          :key="hour"
          :class="{ 'is-peak': hour === slide.bars.highlight }"
          :style="{ height: `${Math.max(4, (value / Math.max(...slide.bars.values, 1)) * 100)}%` }"
        />
      </div>
      <div v-if="slide.bars" class="story-slide__bar-axis" aria-hidden="true">
        <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
      </div>

      <div v-if="slide.columns" class="story-slide__columns">
        <div v-for="column in [slide.columns.left, slide.columns.right]" :key="column.title">
          <span class="story-slide__column-title">{{ column.title }}</span>
          <ol>
            <li v-for="item in column.items" :key="item">{{ item }}</li>
          </ol>
        </div>
      </div>

      <div v-if="slide.emoji?.length" class="story-slide__emoji">
        <span v-for="symbol in slide.emoji" :key="symbol">{{ symbol }}</span>
      </div>

      <dl v-if="slide.stats?.length" class="story-slide__stats">
        <div v-for="stat in slide.stats" :key="stat.label">
          <dt>{{ stat.label }}</dt>
          <dd>{{ stat.value }}</dd>
        </div>
      </dl>
    </div>

    <footer class="story-slide__brand">TG Analyzer</footer>
  </div>
</template>

<style scoped>
.story-slide {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding: 16cqmin 7cqmin 7cqmin;
  color: var(--story-ink);
  container-type: size;
  font-family: var(--font-sans);
}

.story-slide--1 {
  background: var(--story-gradient-1);
}

.story-slide--2 {
  background: var(--story-gradient-2);
}

.story-slide--3 {
  background: var(--story-gradient-3);
}

.story-slide--4 {
  background: var(--story-gradient-4);
}

.story-slide--5 {
  background: var(--story-gradient-5);
}

/* Soft light shapes give depth without competing with the numbers. */
.story-slide__blob {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, var(--story-glow) 0%, transparent 70%);
  pointer-events: none;
}

.story-slide__blob--a {
  top: -20cqmin;
  right: -25cqmin;
  width: 90cqmin;
  height: 90cqmin;
}

.story-slide__blob--b {
  bottom: -30cqmin;
  left: -30cqmin;
  width: 110cqmin;
  height: 110cqmin;
}

.story-slide__people {
  position: relative;
  display: flex;
  align-items: center;
}

.story-slide__face {
  display: inline-grid;
  place-items: center;
  width: 9cqmin;
  height: 9cqmin;
  border: 0.6cqmin solid var(--story-ink);
  border-radius: 50%;
  background: var(--story-chip);
  font-size: 4cqmin;
  font-weight: 700;
}

.story-slide__face--them {
  margin-left: -2.5cqmin;
}

.story-slide__names {
  min-width: 0;
  margin-left: 3cqmin;
  overflow: hidden;
  font-size: 4.4cqmin;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-slide__body {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  gap: 3.5cqmin;
  min-height: 0;
}

.story-slide__kicker {
  color: var(--story-ink-muted);
  font-size: 4.2cqmin;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.story-slide__title {
  font-size: 20cqmin;
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: -0.04em;
  overflow-wrap: anywhere;
}

.story-slide__title--long {
  font-size: 12cqmin;
  line-height: 1.02;
  letter-spacing: -0.03em;
}

.story-slide__sub {
  margin: 0;
  color: var(--story-ink-muted);
  font-size: 4.8cqmin;
  font-weight: 500;
  line-height: 1.3;
}

.story-slide__split {
  display: grid;
  gap: 2cqmin;
}

.story-slide__split-bar {
  display: flex;
  height: 4cqmin;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--story-track);
}

.story-slide__split-bar span {
  border-radius: inherit;
  background: var(--story-ink);
}

.story-slide__split-labels {
  display: flex;
  justify-content: space-between;
  gap: 3cqmin;
  font-size: 3.8cqmin;
  font-weight: 600;
}

.story-slide__bars {
  display: flex;
  align-items: flex-end;
  gap: 0.8cqmin;
  height: 26cqmin;
}

.story-slide__bars span {
  flex: 1;
  border-radius: 0.8cqmin 0.8cqmin 0 0;
  background: var(--story-track);
}

.story-slide__bars span.is-peak {
  background: var(--story-ink);
}

.story-slide__bar-axis {
  display: flex;
  justify-content: space-between;
  margin-top: -2cqmin;
  color: var(--story-ink-muted);
  font-size: 3cqmin;
  font-variant-numeric: tabular-nums;
}

.story-slide__columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4cqmin;
}

.story-slide__column-title {
  display: block;
  margin-bottom: 1.5cqmin;
  color: var(--story-ink-muted);
  font-size: 3.6cqmin;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.story-slide__columns ol {
  display: grid;
  gap: 1.2cqmin;
  margin: 0;
  padding-left: 5cqmin;
  font-size: 5.4cqmin;
  font-weight: 700;
}

.story-slide__columns li {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-slide__emoji {
  display: flex;
  gap: 4cqmin;
  font-size: 16cqmin;
  line-height: 1;
}

.story-slide__stats {
  display: grid;
  gap: 1.6cqmin;
  margin: 2cqmin 0 0;
}

.story-slide__stats div {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 3cqmin;
  padding: 2.4cqmin 3.6cqmin;
  border-radius: 3cqmin;
  background: var(--story-chip);
}

.story-slide__stats dt {
  min-width: 0;
  color: var(--story-ink-muted);
  font-size: 3.8cqmin;
  font-weight: 500;
}

.story-slide__stats dd {
  margin: 0;
  font-size: 4.6cqmin;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.story-slide__brand {
  position: relative;
  align-self: flex-end;
  font-size: 3.8cqmin;
  font-weight: 700;
  letter-spacing: -0.02em;
  opacity: 0.8;
}
</style>

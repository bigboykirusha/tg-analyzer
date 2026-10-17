<script setup lang="ts">
/**
 * One «Итоги» story slide, dense with facts. Purely presentational so the same
 * slide renders on screen (any size) and off screen at 9:16 for the exported
 * image. Sizes are in cqmin, so the layout scales with the slide.
 */
export interface StoryPerson {
  name: string
  /** Photo URL (blob: or data:), or null for initials. */
  avatar: string | null
}

export interface StoryTile {
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
  /** Share of the first person, 0–100, with a label for each side. */
  split?: { mine: number; mineLabel: string; theirsLabel: string }
  /** 24 hourly values; `highlight` is the peak hour. */
  bars?: { values: number[]; highlight: number }
  columns?: { left: { title: string; items: string[] }; right: { title: string; items: string[] } }
  tiles?: StoryTile[]
}

defineProps<{ slide: StorySlideModel; me: StoryPerson; them: StoryPerson }>()

const initial = (name: string) => Array.from(name.trim())[0]?.toLocaleUpperCase() ?? '?'
</script>

<template>
  <div class="story-slide" :class="`story-slide--${slide.theme}`">
    <span class="story-slide__blob story-slide__blob--a" aria-hidden="true" />
    <span class="story-slide__blob story-slide__blob--b" aria-hidden="true" />

    <header class="story-slide__people">
      <span v-for="(person, position) in [me, them]" :key="position" class="story-slide__face">
        <img v-if="person.avatar" :src="person.avatar" alt="" />
        <span v-else>{{ initial(person.name) }}</span>
      </span>
      <span class="story-slide__names">
        <strong>{{ me.name }}</strong>
        <span>&amp;</span>
        <strong>{{ them.name }}</strong>
      </span>
    </header>

    <div class="story-slide__body">
      <span class="story-slide__kicker">{{ slide.kicker }}</span>
      <strong class="story-slide__title" :class="{ 'story-slide__title--long': slide.title.length > 8 }">
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

      <div v-if="slide.bars" class="story-slide__chart" aria-hidden="true">
        <div class="story-slide__bars">
          <span
            v-for="(value, hour) in slide.bars.values"
            :key="hour"
            :class="{ 'is-peak': hour === slide.bars.highlight }"
            :style="{ height: `${Math.max(4, (value / Math.max(...slide.bars.values, 1)) * 100)}%` }"
          />
        </div>
        <div class="story-slide__axis"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></div>
      </div>

      <div v-if="slide.columns" class="story-slide__columns">
        <div v-for="column in [slide.columns.left, slide.columns.right]" :key="column.title">
          <span class="story-slide__column-title">{{ column.title }}</span>
          <ol>
            <li v-for="item in column.items" :key="item">{{ item }}</li>
          </ol>
        </div>
      </div>

      <div v-if="slide.tiles?.length" class="story-slide__tiles">
        <div v-for="tile in slide.tiles" :key="tile.label" class="story-slide__tile">
          <span>{{ tile.label }}</span>
          <strong>{{ tile.value }}</strong>
        </div>
      </div>
    </div>

    <footer class="story-slide__brand">TG Analyzer</footer>
  </div>
</template>

<style scoped>
.story-slide {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4cqmin;
  width: 100%;
  height: 100%;
  overflow: hidden;
  padding: 18cqmin 6cqmin 6cqmin;
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

/* ─── Who: both avatars and both names ───────────────────────────────────── */
.story-slide__people {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 0;
}

.story-slide__face {
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  width: 13cqmin;
  height: 13cqmin;
  overflow: hidden;
  border: 0.8cqmin solid var(--story-ink);
  border-radius: 50%;
  background: var(--story-chip);
  font-size: 5.5cqmin;
  font-weight: 700;
}

.story-slide__face + .story-slide__face {
  margin-left: -3.5cqmin;
}

.story-slide__face img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.story-slide__names {
  display: flex;
  align-items: baseline;
  gap: 1.6cqmin;
  min-width: 0;
  margin-left: 3cqmin;
  overflow: hidden;
  font-size: 5cqmin;
  white-space: nowrap;
}

.story-slide__names strong {
  overflow: hidden;
  font-weight: 700;
  text-overflow: ellipsis;
}

.story-slide__names span {
  color: var(--story-ink-muted);
}

/* ─── Content ────────────────────────────────────────────────────────────── */
.story-slide__body {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  gap: 3cqmin;
  min-height: 0;
}

.story-slide__kicker {
  color: var(--story-ink-muted);
  font-size: 3.8cqmin;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.story-slide__title {
  font-size: 19cqmin;
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: -0.04em;
  overflow-wrap: anywhere;
}

.story-slide__title--long {
  font-size: 12cqmin;
  line-height: 1.02;
}

.story-slide__sub {
  margin: 0;
  color: var(--story-ink-muted);
  font-size: 4.4cqmin;
  font-weight: 500;
  line-height: 1.3;
}

.story-slide__split {
  display: grid;
  gap: 1.6cqmin;
}

.story-slide__split-bar {
  display: flex;
  height: 3.6cqmin;
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
  font-size: 3.6cqmin;
  font-weight: 600;
}

.story-slide__chart {
  display: grid;
  gap: 1.2cqmin;
}

.story-slide__bars {
  display: flex;
  align-items: flex-end;
  gap: 0.8cqmin;
  height: 22cqmin;
}

.story-slide__bars span {
  flex: 1;
  border-radius: 0.8cqmin 0.8cqmin 0 0;
  background: var(--story-track);
}

.story-slide__bars span.is-peak {
  background: var(--story-ink);
}

.story-slide__axis {
  display: flex;
  justify-content: space-between;
  color: var(--story-ink-muted);
  font-size: 2.8cqmin;
  font-variant-numeric: tabular-nums;
}

.story-slide__columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4cqmin;
}

.story-slide__column-title {
  display: block;
  margin-bottom: 1.4cqmin;
  overflow: hidden;
  color: var(--story-ink-muted);
  font-size: 3.4cqmin;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.story-slide__columns ol {
  display: grid;
  gap: 1cqmin;
  margin: 0;
  padding: 0;
  font-size: 5cqmin;
  list-style: none;
  font-weight: 700;
}

.story-slide__columns li {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Facts as a two-column grid of glass tiles. */
.story-slide__tiles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2cqmin;
}

.story-slide__tile {
  display: grid;
  align-content: start;
  gap: 0.8cqmin;
  min-width: 0;
  padding: 2.8cqmin 3.2cqmin;
  border-radius: 3.2cqmin;
  background: var(--story-chip);
}

.story-slide__tile span {
  color: var(--story-ink-muted);
  font-size: 3.1cqmin;
  font-weight: 500;
  line-height: 1.25;
}

.story-slide__tile strong {
  font-size: 4.6cqmin;
  font-weight: 700;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.story-slide__brand {
  position: relative;
  align-self: flex-end;
  font-size: 3.6cqmin;
  font-weight: 700;
  letter-spacing: -0.02em;
  opacity: 0.8;
}
</style>

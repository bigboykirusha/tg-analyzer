<script setup lang="ts">
/**
 * One «Итоги» story slide. Purely presentational, so the same slide renders on
 * screen (any size) and off screen at 9:16 for the exported image.
 *
 * Sizes are in cqmin of the root, which is the size container. Nothing on the
 * root itself uses cq units: on the container they would resolve against the
 * viewport, which differs between the screen and the image renderer.
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
  /** 1–6: which --story-gradient-N paints the slide. */
  theme: 1 | 2 | 3 | 4 | 5 | 6
  /** How long the slide stays before the next one. */
  durationMs: number
  /** The opening slide: big faces instead of the small header. */
  intro?: boolean
  /** The closing summary meant for sharing: denser, larger tiles. */
  poster?: boolean
  kicker: string
  title: string
  sub?: string
  /** The whole chat as a seismograph: yours up, theirs down (paper slides only). */
  pulse?: { sent: number; received: number }[]
  /** A one-line verdict under the picture. */
  note?: string
  /** Share of the first person, 0–100, with a label for each side. */
  split?: { mine: number; mineLabel: string; theirsLabel: string }
  /** 24 hourly values; hours from `from` to `to` (inclusive, may wrap past midnight) are lit. */
  bars?: { values: number[]; from: number; to: number }
  /** Two sides of one measure, side by side. */
  duel?: { left: StoryTile; right: StoryTile }
  /** Top people with their share, 0–100. */
  ranking?: { name: string; value: string; share: number }[]
  columns?: { left: { title: string; items: string[] }; right: { title: string; items: string[] } }
  tiles?: StoryTile[]
}

const { t } = useI18n()

const props = withDefaults(
  defineProps<{
    slide: StorySlideModel
    /** Who the story is about: both sides of a chat, or the group alone. */
    people: StoryPerson[]
    heading: string
    headingSub?: string | null
    /** No entrance animation: the exported image must be the final frame. */
    still?: boolean
    /** On screen the slide sits under the progress bar and the action buttons. */
    chrome?: boolean
  }>(),
  { headingSub: null, still: false, chrome: false },
)

const initial = (name: string) => Array.from(name.trim())[0]?.toLocaleUpperCase() ?? '?'
const maxBar = computed(() => Math.max(...(props.slide.bars?.values ?? [0]), 1))

function lit(hour: number) {
  const bars = props.slide.bars
  if (!bars) return false
  return bars.from <= bars.to ? hour >= bars.from && hour <= bars.to : hour >= bars.from || hour <= bars.to
}

/**
 * Numbers get the huge headline; words get a size their longest word fits in,
 * since a headline never breaks inside a word.
 */
const titleSize = computed(() => {
  const title = props.slide.title
  if (props.slide.poster) return 'mid'
  const longestWord = Math.max(...title.split(/\s+/).map((word) => Array.from(word).length))
  if (/^[\d\s:.,%–-]+$/.test(title) && title.length <= 7) return 'hero'
  if (longestWord <= 7) return 'big'
  return 'mid'
})

/** Poster tiles with long words drop a size instead of breaking the word. */
const isLong = (value: string) => Math.max(...value.split(/\s+/).map((word) => Array.from(word).length)) > 9
</script>

<template>
  <div
    class="story-slide"
    :class="[`story-slide--${slide.theme}`, { 'is-still': still, 'has-chrome': chrome, 'is-poster': slide.poster }]"
  >
    <div class="story-slide__canvas">
      <header v-if="!slide.intro" class="story-slide__people">
        <span class="story-slide__faces">
          <span v-for="(person, position) in people" :key="position" class="story-slide__face">
            <img v-if="person.avatar" :src="person.avatar" alt="" />
            <span v-else>{{ initial(person.name) }}</span>
          </span>
        </span>
        <span class="story-slide__heading">
          <strong>{{ heading }}</strong>
          <span v-if="headingSub">{{ headingSub }}</span>
        </span>
      </header>

      <div class="story-slide__body">
        <div v-if="slide.intro" class="story-slide__intro-faces">
          <span v-for="(person, position) in people" :key="position" class="story-slide__face story-slide__face--xl">
            <img v-if="person.avatar" :src="person.avatar" alt="" />
            <span v-else>{{ initial(person.name) }}</span>
          </span>
        </div>

        <span class="story-slide__kicker">{{ slide.kicker }}</span>
        <strong class="story-slide__title" :class="`story-slide__title--${titleSize}`">{{ slide.title }}</strong>
        <p v-if="slide.sub" class="story-slide__sub">{{ slide.sub }}</p>

        <div v-if="slide.pulse" class="story-slide__pulse" aria-hidden="true">
          <Seismograph :days="slide.pulse" :height="1" />
        </div>

        <div v-if="slide.split" class="story-slide__split">
          <div class="story-slide__split-bar">
            <span :style="{ width: `${slide.split.mine}%` }" />
          </div>
          <div class="story-slide__split-labels">
            <span>{{ slide.split.mineLabel }}</span>
            <span>{{ slide.split.theirsLabel }}</span>
          </div>
        </div>

        <div v-if="slide.duel" class="story-slide__duel">
          <div v-for="side in [slide.duel.left, slide.duel.right]" :key="side.label" class="story-slide__duel-side">
            <span>{{ side.label }}</span>
            <strong>{{ side.value }}</strong>
          </div>
        </div>

        <ol v-if="slide.ranking" class="story-slide__ranking">
          <li v-for="(person, position) in slide.ranking" :key="position">
            <span class="story-slide__rank">{{ position + 1 }}</span>
            <span class="story-slide__rank-name">{{ person.name }}</span>
            <span class="story-slide__rank-value">{{ person.value }}</span>
            <span class="story-slide__rank-bar"><i :style="{ width: `${Math.max(3, person.share)}%` }" /></span>
          </li>
        </ol>

        <div v-if="slide.bars" class="story-slide__chart" aria-hidden="true">
          <div class="story-slide__bars">
            <span
              v-for="(value, hour) in slide.bars.values"
              :key="hour"
              :class="{ 'is-lit': lit(hour) }"
              :style="{ height: `${Math.max(4, (value / maxBar) * 100)}%`, '--bar': hour * 14 }"
            />
          </div>
          <div class="story-slide__axis">
            <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
          </div>
        </div>

        <div v-if="slide.columns" class="story-slide__columns">
          <div v-for="column in [slide.columns.left, slide.columns.right]" :key="column.title">
            <span class="story-slide__column-title">{{ column.title }}</span>
            <ol>
              <li v-for="item in column.items" :key="item">{{ item }}</li>
            </ol>
          </div>
        </div>

        <p v-if="slide.note" class="story-slide__note">{{ slide.note }}</p>

        <div v-if="slide.tiles?.length" class="story-slide__tiles">
          <div v-for="tile in slide.tiles" :key="tile.label" class="story-slide__tile">
            <span>{{ tile.label }}</span>
            <strong :class="{ 'is-long': isLong(tile.value) }">{{ tile.value }}</strong>
          </div>
        </div>
      </div>

      <footer class="story-slide__brand">
        <span class="story-slide__brand-mark" aria-hidden="true"><i /><i /><i /></span>
        TG Analyzer
        <span v-if="slide.poster" class="story-slide__site">{{ t('story.site') }}</span>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* The root only sizes the container; the canvas does the layout. */
.story-slide {
  width: 100%;
  height: 100%;
  overflow: hidden;
  container-type: size;
  color: var(--story-ink);
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

.story-slide--2,
.story-slide--3,
.story-slide--4,
.story-slide--5,
.story-slide--6 {
  --story-ink: var(--story-paper-ink);
  --story-ink-muted: var(--story-paper-ink-muted);
  --story-track: var(--story-paper-track);
  --story-chip: var(--story-paper-chip);
}

.story-slide--4 {
  background: var(--story-gradient-4);
}

.story-slide--5 {
  background: var(--story-gradient-5);
}

.story-slide--6 {
  background: var(--story-gradient-6);
}

/* On the ink field the lit bars and your share are lime, as in the app. */
.story-slide--1 .story-slide__bars span.is-lit,
.story-slide--1 .story-slide__split-bar span {
  background: var(--story-accent);
}

/* Top 14% and bottom stay clear: the story apps draw their own controls there. */
.story-slide__canvas {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4cqmin;
  height: 100%;
  padding: 16cqmin 7cqmin 7cqmin;
}

.has-chrome .story-slide__canvas {
  padding-bottom: 22cqmin;
}

/* ─── Who: avatars and the names ─────────────────────────────────────────── */
.story-slide__people {
  position: relative;
  display: flex;
  align-items: center;
  gap: 3cqmin;
  min-width: 0;
}

.story-slide__faces {
  display: flex;
  flex: 0 0 auto;
}

.story-slide__face {
  display: inline-grid;
  font-family: var(--font-display);
  flex: 0 0 auto;
  place-items: center;
  width: 12cqmin;
  height: 12cqmin;
  overflow: hidden;
  border: 0.7cqmin solid var(--story-ink);
  border-radius: 50%;
  background: var(--story-chip);
  font-size: 5cqmin;
  font-weight: 600;
}

.story-slide--2 .story-slide__face {
  border-color: var(--story-gradient-2);
}

.story-slide--3 .story-slide__face {
  border-color: var(--story-gradient-3);
}

.story-slide--4 .story-slide__face {
  border-color: var(--story-gradient-4);
}

.story-slide--5 .story-slide__face {
  border-color: var(--story-gradient-5);
}

.story-slide--6 .story-slide__face {
  border-color: var(--story-gradient-6);
}

.story-slide__face + .story-slide__face {
  margin-left: -3.5cqmin;
}

.story-slide__face img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.story-slide__heading {
  display: grid;
  min-width: 0;
  line-height: 1.2;
}

.story-slide__heading strong,
.story-slide__heading span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-slide__heading strong {
  font-size: 4.6cqmin;
  font-weight: 600;
}

.story-slide__heading span {
  color: var(--story-ink-muted);
  font-size: 3.4cqmin;
  font-weight: 500;
}

/* ─── Content ────────────────────────────────────────────────────────────── */
.story-slide__body {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  gap: 3.4cqmin;
  min-height: 0;
}

.story-slide__intro-faces {
  display: flex;
  margin-bottom: 3cqmin;
}

.story-slide__face--xl {
  width: 30cqmin;
  height: 30cqmin;
  border-width: 1.2cqmin;
  font-size: 12cqmin;
}

.story-slide__face--xl + .story-slide__face--xl {
  margin-left: -7cqmin;
}

.story-slide__kicker {
  color: var(--story-ink-muted);
  font-size: 3.8cqmin;
  font-weight: 500;
}

.story-slide__title {
  font-family: var(--font-display);
  font-weight: 600;
  font-variant-numeric: lining-nums;
  letter-spacing: -0.03em;
  overflow-wrap: break-word;
}

.story-slide__title--hero {
  font-size: 21cqmin;
  line-height: 0.95;
}

.story-slide__title--big {
  font-size: 14cqmin;
  line-height: 1;
}

.story-slide__title--mid {
  font-size: 10cqmin;
  line-height: 1.05;
  letter-spacing: -0.03em;
}

.story-slide__sub {
  margin: 0;
  color: var(--story-ink-muted);
  font-size: 4.6cqmin;
  font-weight: 500;
  line-height: 1.3;
}

/* Sized in cq units by its box; the chart fills it. */
.story-slide__pulse {
  height: 22cqmin;
  margin-top: 2cqmin;
}

.story-slide__pulse :deep(.seismograph) {
  height: 100% !important;
}

.story-slide__pulse :deep(line) {
  stroke-width: 0.9cqmin;
}

.story-slide__split {
  display: grid;
  gap: 1.6cqmin;
  margin-top: 2cqmin;
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

.story-slide__duel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.4cqmin;
  margin-top: 2cqmin;
}

.story-slide__duel-side {
  display: grid;
  gap: 1cqmin;
  min-width: 0;
  padding-top: 2.6cqmin;
  border-top: 0.4cqmin solid var(--story-track);
}

.story-slide__duel-side span {
  overflow: hidden;
  color: var(--story-ink-muted);
  font-size: 3.4cqmin;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-slide__duel-side strong {
  font-family: var(--font-display);
  font-size: 9cqmin;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.story-slide__ranking {
  display: grid;
  gap: 2.6cqmin;
  margin: 2cqmin 0 0;
  padding: 0;
  list-style: none;
}

.story-slide__ranking li {
  display: grid;
  grid-template-columns: 6cqmin minmax(0, 1fr) auto;
  align-items: baseline;
  row-gap: 1.2cqmin;
  font-size: 5cqmin;
  font-weight: 600;
}

.story-slide__rank {
  color: var(--story-ink-muted);
  font-variant-numeric: tabular-nums;
}

.story-slide__rank-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-slide__rank-value {
  font-size: 4cqmin;
  font-variant-numeric: tabular-nums;
}

.story-slide__rank-bar {
  grid-column: 2 / -1;
  height: 1.6cqmin;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--story-track);
}

.story-slide__rank-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--story-ink);
}

.story-slide__chart {
  display: grid;
  gap: 1.2cqmin;
  margin-top: 2cqmin;
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

.story-slide__bars span.is-lit {
  background: var(--story-ink);
}

.story-slide__axis {
  display: flex;
  justify-content: space-between;
  color: var(--story-ink-muted);
  font-size: 3cqmin;
  font-variant-numeric: tabular-nums;
}

.story-slide__columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4cqmin;
  margin-top: 1cqmin;
}

.story-slide__column-title {
  display: block;
  margin-bottom: 1.4cqmin;
  overflow: hidden;
  color: var(--story-ink-muted);
  font-size: 3.4cqmin;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-slide__columns ol {
  display: grid;
  gap: 1cqmin;
  margin: 0;
  padding: 0;
  font-size: 5.4cqmin;
  font-weight: 600;
  list-style: none;
}

.story-slide__columns li {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-slide__note {
  margin: 0;
  font-family: var(--font-display);
  font-size: 5.2cqmin;
  font-weight: 500;
  line-height: 1.3;
}

/* Facts as a two-column ledger. */
.story-slide__tiles {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3cqmin 5cqmin;
  margin-top: 1cqmin;
}

/* Ruled like a ledger, the way facts look in the app. */
.story-slide__tile {
  display: grid;
  align-content: start;
  gap: 1cqmin;
  min-width: 0;
  padding-top: 2.4cqmin;
  border-top: 0.4cqmin solid var(--story-track);
}

.story-slide__tile span {
  color: var(--story-ink-muted);
  font-size: 3.2cqmin;
  font-weight: 600;
  line-height: 1.25;
}

.story-slide__tile strong {
  font-family: var(--font-display);
  font-size: 5.4cqmin;
  font-weight: 600;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
  overflow-wrap: break-word;
}

/* The summary poster: everything is a tile, numbers carry the slide. */
.is-poster .story-slide__tiles {
  gap: 3.4cqmin 5cqmin;
}

.is-poster .story-slide__tile {
  min-height: 17cqmin;
}

.is-poster .story-slide__tile strong {
  font-size: 6.4cqmin;
  letter-spacing: -0.02em;
}

.is-poster .story-slide__tile strong.is-long {
  font-size: 4.8cqmin;
}

.story-slide__site {
  margin-left: 1.6cqmin;
  font-family: var(--font-sans);
  font-size: 3.2cqmin;
  font-weight: 500;
  opacity: 0.6;
}

.story-slide__brand {
  position: relative;
  display: flex;
  align-items: center;
  align-self: flex-start;
  gap: 1.6cqmin;
  font-family: var(--font-display);
  font-size: 4cqmin;
  font-weight: 600;
  letter-spacing: -0.015em;
}

.story-slide__brand-mark {
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  gap: 0.5cqmin;
  width: 6.4cqmin;
  height: 6.4cqmin;
  padding: 1.4cqmin;
  border-radius: 1.2cqmin;
  background: var(--story-ink);
}

.story-slide__brand-mark i {
  width: 0.8cqmin;
  border-radius: var(--radius-full);
  background: var(--story-backdrop);
}

.story-slide__brand-mark i:nth-child(1) {
  height: 1.6cqmin;
}

.story-slide__brand-mark i:nth-child(2) {
  height: 3.2cqmin;
}

.story-slide__brand-mark i:nth-child(3) {
  height: 2.2cqmin;
}

/* ─── Entrance: the slide builds up line by line, like Wrapped ───────────── */
.story-slide:not(.is-still) .story-slide__body > * {
  animation: story-rise 520ms var(--ease-out-expo) both;
}

.story-slide:not(.is-still) .story-slide__body > :nth-child(2) {
  animation-delay: 80ms;
}

.story-slide:not(.is-still) .story-slide__body > :nth-child(3) {
  animation-delay: 160ms;
}

.story-slide:not(.is-still) .story-slide__body > :nth-child(4) {
  animation-delay: 280ms;
}

.story-slide:not(.is-still) .story-slide__body > :nth-child(n + 5) {
  animation-delay: 400ms;
}

.story-slide:not(.is-still) .story-slide__bars span {
  transform-origin: bottom;
  animation: story-grow 640ms var(--ease-out-expo) both;
  animation-delay: calc(360ms + var(--bar, 0) * 1ms);
}

@keyframes story-rise {
  from {
    opacity: 0;
    transform: translateY(4cqmin);
  }
}

@keyframes story-grow {
  from {
    transform: scaleY(0);
  }
}
</style>

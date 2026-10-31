<script setup lang="ts">
/**
 * One «Итоги» story slide: a headline over a small bento of tiles, the way the
 * app shows a report. Purely presentational, so the same slide renders on
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

interface BlockBase {
  /** The one tile per slide that carries the contrast colour. */
  accent?: boolean
  /** Spans both columns. Charts and lists always do. */
  wide?: boolean
}

export type StoryBlock = BlockBase &
  (
    | { kind: 'stat'; label: string; value: string; note?: string }
    /** The whole chat as a seismograph: yours up, theirs down. */
    | { kind: 'pulse'; label: string; days: { sent: number; received: number }[] }
    /** Share of the first person, 0–100, with a label for each side. */
    | { kind: 'split'; label: string; mine: number; mineLabel: string; theirsLabel: string; note?: string }
    /** Two sides of one measure, side by side. */
    | { kind: 'duel'; label: string; left: StoryTile; right: StoryTile; note?: string }
    /** 24 hourly values; hours from `from` to `to` (inclusive, may wrap past midnight) are lit. */
    | { kind: 'bars'; label: string; values: number[]; from: number; to: number; note?: string }
    /** Top people with their share, 0–100. */
    | { kind: 'ranking'; label: string; items: { name: string; value: string; share: number }[] }
    | { kind: 'columns'; left: { title: string; items: string[] }; right: { title: string; items: string[] } }
  )

export interface StorySlideModel {
  key: string
  /** 1–6: which --story-gradient-N paints the slide. */
  theme: 1 | 2 | 3 | 4 | 5 | 6
  /** How long the slide stays before the next one. */
  durationMs: number
  /** The closing slide: carries the site address for whoever sees it shared. */
  last?: boolean
  kicker: string
  title: string
  sub?: string
  blocks: StoryBlock[]
}

const site = useSiteHost()

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
const isWide = (block: StoryBlock) => block.wide || block.kind !== 'stat'
const maxOf = (values: number[]) => Math.max(...values, 1)

function lit(block: { from: number; to: number }, hour: number) {
  return block.from <= block.to ? hour >= block.from && hour <= block.to : hour >= block.from || hour <= block.to
}

/**
 * Numbers get the huge headline; words get a size their longest word fits in,
 * since a headline never breaks inside a word.
 */
const titleSize = computed(() => {
  const title = props.slide.title
  const longestWord = Math.max(...title.split(/\s+/).map((word) => Array.from(word).length))
  if (/^[\d\s:.,%–-]+$/.test(title) && title.length <= 7) return 'hero'
  if (longestWord <= 8 && title.length <= 16) return 'big'
  return 'mid'
})

/** Tile values with long words drop a size instead of breaking the word. */
const isLong = (value: string) => Math.max(...value.split(/\s+/).map((word) => Array.from(word).length)) > 8
</script>

<template>
  <div class="story-slide" :class="[`story-slide--${slide.theme}`, { 'is-still': still, 'has-chrome': chrome }]">
    <div class="story-slide__canvas">
      <div class="story-slide__people">
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
      </div>

      <div class="story-slide__body">
        <div class="story-slide__head">
          <span class="story-slide__kicker">{{ slide.kicker }}</span>
          <strong class="story-slide__title" :class="`story-slide__title--${titleSize}`">{{ slide.title }}</strong>
          <p v-if="slide.sub" class="story-slide__sub">{{ slide.sub }}</p>
        </div>

        <div class="story-slide__grid">
          <section
            v-for="(block, position) in slide.blocks"
            :key="position"
            class="story-tile"
            :class="[`story-tile--${block.kind}`, { 'is-wide': isWide(block), 'is-accent': block.accent }]"
          >
            <template v-if="block.kind === 'stat'">
              <span class="story-tile__label">{{ block.label }}</span>
              <strong class="story-tile__value" :class="{ 'is-long': isLong(block.value) }">{{ block.value }}</strong>
              <span v-if="block.note" class="story-tile__note">{{ block.note }}</span>
            </template>

            <template v-else-if="block.kind === 'pulse'">
              <span class="story-tile__label">{{ block.label }}</span>
              <div class="story-tile__pulse" aria-hidden="true">
                <Seismograph :days="block.days" :height="1" />
              </div>
            </template>

            <template v-else-if="block.kind === 'split'">
              <span class="story-tile__label">{{ block.label }}</span>
              <div class="story-tile__split-bar"><span :style="{ width: `${block.mine}%` }" /></div>
              <div class="story-tile__split-labels">
                <span>{{ block.mineLabel }}</span>
                <span>{{ block.theirsLabel }}</span>
              </div>
              <span v-if="block.note" class="story-tile__note">{{ block.note }}</span>
            </template>

            <template v-else-if="block.kind === 'duel'">
              <span class="story-tile__label">{{ block.label }}</span>
              <div class="story-tile__duel">
                <div v-for="side in [block.left, block.right]" :key="side.label">
                  <span>{{ side.label }}</span>
                  <strong>{{ side.value }}</strong>
                </div>
              </div>
              <span v-if="block.note" class="story-tile__note">{{ block.note }}</span>
            </template>

            <template v-else-if="block.kind === 'bars'">
              <span class="story-tile__label">{{ block.label }}</span>
              <div class="story-tile__bars" aria-hidden="true">
                <span
                  v-for="(value, hour) in block.values"
                  :key="hour"
                  :class="{ 'is-lit': lit(block, hour) }"
                  :style="{ height: `${Math.max(4, (value / maxOf(block.values)) * 100)}%`, '--bar': hour * 14 }"
                />
              </div>
              <div class="story-tile__axis">
                <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
              </div>
            </template>

            <template v-else-if="block.kind === 'ranking'">
              <span class="story-tile__label">{{ block.label }}</span>
              <ol class="story-tile__ranking">
                <li v-for="(person, place) in block.items" :key="place">
                  <span class="story-tile__rank">{{ place + 1 }}</span>
                  <span class="story-tile__rank-name">{{ person.name }}</span>
                  <span class="story-tile__rank-value">{{ person.value }}</span>
                  <span class="story-tile__rank-bar"><i :style="{ width: `${Math.max(3, person.share)}%` }" /></span>
                </li>
              </ol>
            </template>

            <div v-else-if="block.kind === 'columns'" class="story-tile__columns">
              <div v-for="column in [block.left, block.right]" :key="column.title">
                <span class="story-tile__label">{{ column.title }}</span>
                <ol>
                  <li v-for="item in column.items" :key="item">{{ item }}</li>
                </ol>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div class="story-slide__brand">
        <span class="story-slide__brand-mark" aria-hidden="true"><i /><i /><i /></span>
        TG Analyzer
        <span v-if="slide.last" class="story-slide__site">{{ site }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* The root only sizes the container; the canvas does the layout. */
.story-slide {
  /* Tiles: dark cards and a lime accent on the ink field. */
  --tile-bg: var(--story-card);
  --tile-ink: var(--story-ink);
  --tile-muted: var(--story-dark-ink-muted);
  --tile-track: var(--story-dark-track);
  --tile-mark: var(--story-accent);
  --accent-bg: var(--story-accent);
  --accent-ink: var(--story-accent-ink);
  --accent-muted: var(--story-accent-ink-muted);
  --accent-track: var(--story-accent-track);
  --accent-mark: var(--story-accent-ink);

  width: 100%;
  height: 100%;
  overflow: hidden;
  container-type: size;
  color: var(--story-ink);
  font-family: var(--font-sans);
  /* html2canvas draws proportional digits; tabular layout would leave gaps in the image. */
  font-variant-numeric: normal;
  background: var(--story-gradient-1);
}

/* Paper fields: white cards, the accent tile is ink with lime marks. */
.story-slide--2,
.story-slide--3,
.story-slide--4,
.story-slide--5,
.story-slide--6 {
  --story-ink: var(--story-paper-ink);
  --story-ink-muted: var(--story-paper-ink-muted);
  --story-chip: var(--story-paper-chip);
  --tile-bg: var(--story-paper-card);
  --tile-ink: var(--story-paper-ink);
  --tile-muted: var(--story-paper-ink-muted);
  --tile-track: var(--story-paper-track);
  --tile-mark: var(--story-paper-ink);
  --accent-bg: var(--story-gradient-1);
  --accent-ink: var(--story-dark-ink);
  --accent-muted: var(--story-dark-ink-muted);
  --accent-track: var(--story-dark-track);
  --accent-mark: var(--story-accent);
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

.story-slide--6 {
  background: var(--story-gradient-6);
}

/*
 * Telegram and Instagram draw the author and progress over the top ~13% of a
 * story and the reply bar over the bottom ~13%: nothing important goes there.
 * The screen uses the same frame, so what you see is what you share.
 */
.story-slide__canvas {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4cqmin;
  height: 100%;
  padding: 24cqmin 6cqmin 24cqmin;
}

/* ─── Who: avatars and the names ─────────────────────────────────────────── */
.story-slide__people {
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
  flex: 0 0 auto;
  place-items: center;
  width: 8cqmin;
  height: 8cqmin;
  overflow: hidden;
  border-radius: 50%;
  background: var(--story-chip);
  box-shadow: 0 0 0 0.7cqmin var(--story-gradient-1);
  font-size: 3.6cqmin;
  font-weight: 600;
}

.story-slide--2 .story-slide__face {
  box-shadow: 0 0 0 0.7cqmin var(--story-gradient-2);
}

.story-slide--3 .story-slide__face {
  box-shadow: 0 0 0 0.7cqmin var(--story-gradient-3);
}

.story-slide--4 .story-slide__face {
  box-shadow: 0 0 0 0.7cqmin var(--story-gradient-4);
}

.story-slide--5 .story-slide__face {
  box-shadow: 0 0 0 0.7cqmin var(--story-gradient-5);
}

.story-slide--6 .story-slide__face {
  box-shadow: 0 0 0 0.7cqmin var(--story-gradient-6);
}

.story-slide__face + .story-slide__face {
  margin-left: -2cqmin;
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
  font-size: 4.4cqmin;
  font-weight: 600;
}

.story-slide__heading span {
  color: var(--story-ink-muted);
  font-size: 3.3cqmin;
  font-weight: 500;
}

/* ─── Headline ───────────────────────────────────────────────────────────── */
.story-slide__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3cqmin;
  min-height: 0;
}

.story-slide__head {
  display: grid;
  gap: 1.6cqmin;
}

.story-slide__kicker {
  color: var(--story-ink-muted);
  font-size: 3.8cqmin;
  font-weight: 500;
}

.story-slide__title {
  font-weight: 600;
  letter-spacing: -0.045em;
  overflow-wrap: break-word;
}

.story-slide__title--hero {
  font-size: 17cqmin;
  line-height: 0.92;
}

.story-slide__title--big {
  font-size: 11.5cqmin;
  line-height: 0.98;
}

.story-slide__title--mid {
  font-size: 8.4cqmin;
  line-height: 1.02;
}

.story-slide__sub {
  margin: 0;
  color: var(--story-ink-muted);
  font-size: 3.8cqmin;
  font-weight: 500;
  line-height: 1.3;
}

/* ─── Tiles: a two-column bento, like the report in the app ─────────────── */
.story-slide__grid {
  display: grid;
  /* Pinned to the bottom; if a slide ever overflows it pushes down, never over the headline. */
  flex: 0 0 auto;
  margin-top: auto;
  grid-template-columns: 1fr 1fr;
  grid-auto-rows: minmax(min-content, auto);
  align-content: end;
  gap: 1.8cqmin;
  min-height: 0;
}

.story-tile {
  display: flex;
  flex-direction: column;
  gap: 1.2cqmin;
  min-width: 0;
  padding: 3cqmin 3.6cqmin;
  border-radius: 4cqmin;
  background: var(--tile-bg);
  color: var(--tile-ink);
  --muted: var(--tile-muted);
  --track: var(--tile-track);
  --mark: var(--tile-mark);
}

.story-tile.is-accent {
  background: var(--accent-bg);
  color: var(--accent-ink);
  --muted: var(--accent-muted);
  --track: var(--accent-track);
  --mark: var(--accent-mark);
}

.story-tile.is-wide {
  grid-column: 1 / -1;
}

.story-tile__label {
  color: var(--muted);
  font-size: 3.2cqmin;
  font-weight: 500;
  line-height: 1.25;
}

.story-tile__columns .story-tile__label {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-tile__value {
  margin-top: auto;
  font-size: 6.4cqmin;
  font-weight: 600;
  line-height: 1.05;
  letter-spacing: -0.035em;
  overflow-wrap: break-word;
}

.story-tile__value.is-long {
  font-size: 4.8cqmin;
}

.story-tile__note {
  color: var(--muted);
  font-size: 3.2cqmin;
  font-weight: 500;
  line-height: 1.3;
}

/* Sized in cq units by its box; the chart fills it. */
.story-tile__pulse {
  --you: var(--tile-ink);
  --them: var(--story-accent);
  --border-strong: var(--tile-track);

  height: 11cqmin;
}

.story-tile__pulse :deep(.seismograph) {
  height: 100% !important;
}

.story-tile__pulse :deep(line) {
  stroke-width: 0.8cqmin;
}

.story-tile__split-bar {
  display: flex;
  height: 3.2cqmin;
  margin-top: 1cqmin;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--track);
}

.story-tile__split-bar span {
  border-radius: inherit;
  background: var(--mark);
}

.story-tile__split-labels {
  display: flex;
  justify-content: space-between;
  gap: 3cqmin;
  font-size: 3.8cqmin;
  font-weight: 600;
}

.story-tile__duel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3cqmin;
}

.story-tile__duel div {
  display: grid;
  gap: 0.8cqmin;
  min-width: 0;
}

.story-tile__duel span {
  overflow: hidden;
  color: var(--muted);
  font-size: 3.2cqmin;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-tile__duel strong {
  font-size: 6.4cqmin;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.035em;
}

.story-tile__bars {
  display: flex;
  align-items: flex-end;
  gap: 0.7cqmin;
  height: 10cqmin;
  margin-top: 1cqmin;
}

.story-tile__bars span {
  flex: 1;
  border-radius: 0.7cqmin;
  background: var(--track);
}

.story-tile__bars span.is-lit {
  background: var(--mark);
}

.story-tile__axis {
  display: flex;
  justify-content: space-between;
  color: var(--muted);
  font-size: 2.8cqmin;
}

.story-tile__ranking {
  display: grid;
  gap: 2.2cqmin;
  margin: 0;
  padding: 0;
  list-style: none;
}

.story-tile__ranking li {
  display: grid;
  grid-template-columns: 5cqmin minmax(0, 1fr) auto;
  align-items: baseline;
  row-gap: 1cqmin;
  font-size: 4.4cqmin;
  font-weight: 600;
}

.story-tile__rank {
  color: var(--muted);
}

.story-tile__rank-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-tile__rank-value {
  font-size: 3.8cqmin;
}

.story-tile__rank-bar {
  grid-column: 2 / -1;
  height: 1.4cqmin;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--track);
}

.story-tile__rank-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--mark);
}

.story-tile__columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4cqmin;
}

.story-tile__columns ol {
  display: grid;
  gap: 0.8cqmin;
  margin: 1cqmin 0 0;
  padding: 0;
  font-size: 4.2cqmin;
  font-weight: 600;
  letter-spacing: -0.02em;
  list-style: none;
}

.story-tile__columns li {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ─── Brand ──────────────────────────────────────────────────────────────── */
.story-slide__brand {
  display: flex;
  align-items: center;
  align-self: flex-start;
  gap: 1.6cqmin;
  font-size: 3.8cqmin;
  font-weight: 600;
  letter-spacing: -0.015em;
}

.story-slide__site {
  margin-left: 1cqmin;
  color: var(--story-ink-muted);
  font-weight: 500;
}

.story-slide__brand-mark {
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  gap: 0.5cqmin;
  width: 6.4cqmin;
  height: 6.4cqmin;
  padding: 1.4cqmin;
  border-radius: 1.6cqmin;
  background: var(--story-ink);
}

.story-slide__brand-mark i {
  width: 0.8cqmin;
  border-radius: var(--radius-full);
  background: var(--story-accent);
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

/* ─── Entrance: headline first, then the tiles one by one ────────────────── */
.story-slide:not(.is-still) .story-slide__head,
.story-slide:not(.is-still) .story-tile {
  animation: story-rise 520ms var(--ease-out-expo) both;
}

.story-slide:not(.is-still) .story-tile:nth-child(1) {
  animation-delay: 120ms;
}

.story-slide:not(.is-still) .story-tile:nth-child(2) {
  animation-delay: 200ms;
}

.story-slide:not(.is-still) .story-tile:nth-child(3) {
  animation-delay: 280ms;
}

.story-slide:not(.is-still) .story-tile:nth-child(n + 4) {
  animation-delay: 360ms;
}

.story-slide:not(.is-still) .story-tile__bars span {
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

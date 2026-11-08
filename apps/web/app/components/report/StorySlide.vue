<script setup lang="ts">
/**
 * One «Итоги» story slide: a headline over a small bento of tiles, the way the
 * app shows a report. Purely presentational, so the same slide renders on
 * screen (any size), as the preview in «Поделиться» and off screen at 9:16 for
 * the exported image.
 *
 * Sizes are in cqmin of the root, which is the size container. Nothing on the
 * root itself uses cq units: on the container they would resolve against the
 * viewport, which differs between the screen and the image renderer. The
 * slide's own type scale (six roles) therefore lives on the canvas inside it.
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
    /** The whole chat as a seismograph: yours up, theirs down; chapters under it, by share of time. */
    | {
        kind: 'pulse'
        label: string
        days: { sent: number; received: number }[]
        chapters?: { name: string; share: number; peak: boolean }[]
      }
    /** «52% ━━━━ ━━━ 48%»: two sides of one measure as a split line, names under the ends. */
    | { kind: 'split'; label: string; left: StoryTile; right: StoryTile; mine: number; theirs: number; note?: string }
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
  kicker: string
  title: string
  sub?: string
  /** The cover only: the person's name, set as large as on the report's poster. */
  display?: string
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
 * Numbers get the figure; words get the serif headline when their longest word fits
 * the line (a headline never breaks inside a word), the smaller one otherwise.
 */
const titleSize = computed(() => {
  const title = props.slide.title
  if (/^[\d\s:.,%–-]+$/.test(title) && title.length <= 7) return 'figure'
  if (longestWord(title) <= 13 && title.length <= 28) return 'h1'
  return 'h2'
})

function longestWord(value: string) {
  return Math.max(...value.split(/\s+/).map((word) => Array.from(word).length))
}

/** Tile values with long words in a half-width tile drop a size instead of breaking the word. */
const isLong = (value: string) => longestWord(value) > 8
</script>

<template>
  <div
    class="story-slide"
    :class="[
      `story-slide--${slide.theme}`,
      { 'is-still': still, 'has-chrome': chrome, 'is-dense': slide.blocks.length >= 3 },
    ]"
  >
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
          <strong
            v-if="slide.display"
            class="story-slide__display"
            :class="{ 'story-slide__display--long': slide.display.length > 12 }"
            >{{ slide.display }}</strong
          >
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
              <strong class="story-tile__value" :class="{ 'is-long': !isWide(block) && isLong(block.value) }">{{
                block.value
              }}</strong>
              <span v-if="block.note" class="story-tile__note">{{ block.note }}</span>
            </template>

            <template v-else-if="block.kind === 'pulse'">
              <span class="story-tile__label">{{ block.label }}</span>
              <div class="story-tile__pulse" aria-hidden="true">
                <Seismograph :days="block.days" :height="1" />
              </div>
              <ol v-if="block.chapters?.length" class="story-tile__chapters">
                <li
                  v-for="(chapter, place) in block.chapters"
                  :key="place"
                  :class="{ 'is-peak': chapter.peak }"
                  :style="{ flexGrow: chapter.share }"
                >
                  <span v-if="chapter.share >= 0.14">{{ chapter.name }}</span>
                </li>
              </ol>
            </template>

            <template v-else-if="block.kind === 'split'">
              <span class="story-tile__label">{{ block.label }}</span>
              <div class="story-tile__split" :class="{ 'is-bare': block.mine <= 0 && block.theirs <= 0 }">
                <strong>{{ block.left.value }}</strong>
                <span class="story-tile__split-bar" aria-hidden="true">
                  <i v-if="block.mine > 0" :style="{ flexGrow: block.mine }" />
                  <i v-if="block.theirs > 0" class="is-them" :style="{ flexGrow: block.theirs }" />
                </span>
                <strong>{{ block.right.value }}</strong>
              </div>
              <div class="story-tile__split-names">
                <span>{{ block.left.label }}</span>
                <span>{{ block.right.label }}</span>
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
                  :style="{ height: `${Math.max(4, (value / maxOf(block.values)) * 100)}%`, '--bar': hour }"
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
        <span class="story-slide__brand-name">
          <BrandMark class="story-slide__brand-mark" />
          TG Analyzer
        </span>
        <!-- The address on every slide: any one of them may be the picture that gets shared. -->
        <span class="story-slide__site">{{ site }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * Colours: a slide is a field (ink, lime or paper) and every field gives the same roles to its
 * text, its tiles and its one accent tile. Posters look the same in both themes, so only --story-*
 * tokens are read here. The root may carry colours, never cq units (see the note in the script).
 */
.story-slide {
  /* The field. */
  --s-ink: var(--story-ink);
  --s-muted: var(--story-ink-muted);
  --s-track: var(--story-track);
  --s-chip: var(--story-chip);
  --s-them: var(--story-accent);
  /* Tiles: dark cards on the ink field. */
  --s-card: var(--story-card);
  --s-card-ink: var(--story-ink);
  --s-card-muted: var(--story-ink-muted);
  --s-card-track: var(--story-track);
  --s-card-mark: var(--story-accent);
  /* The accent tile: the person's colour on the ink field. */
  --s-accent: var(--story-accent);
  --s-accent-ink: var(--story-accent-ink);
  --s-accent-muted: var(--story-accent-ink-muted);
  --s-accent-track: var(--story-accent-track);
  --s-accent-mark: var(--story-accent-ink);
  /* The square of the logo: a step off the ink field, ink on every other one. */
  --s-logo: var(--story-card);

  width: 100%;
  height: 100%;
  overflow: hidden;
  container-type: size;
  display: grid;
  align-content: center;
  color: var(--s-ink);
  font-family: var(--font-sans);
  background: var(--story-gradient-1);
}

/*
 * html2canvas draws proportional glyphs at tabular positions, which leaves gaps («51 %»). The app
 * sets tabular figures on every element under #teleports, so only !important wins here.
 */
.story-slide,
.story-slide * {
  font-variant-numeric: normal !important;
}

/* Paper fields (and the person's colour): white cards, the accent tile is ink with their marks. */
.story-slide--2,
.story-slide--3,
.story-slide--4,
.story-slide--5,
.story-slide--6 {
  --s-ink: var(--story-paper-ink);
  --s-muted: var(--story-paper-ink-muted);
  --s-track: var(--story-paper-track);
  --s-chip: var(--story-paper-chip);
  --s-card: var(--story-paper-card);
  --s-card-ink: var(--story-paper-ink);
  --s-card-muted: var(--story-paper-ink-muted);
  --s-card-track: var(--story-paper-track);
  --s-card-mark: var(--story-paper-ink);
  --s-accent: var(--story-gradient-1);
  --s-accent-ink: var(--story-ink);
  --s-accent-muted: var(--story-ink-muted);
  --s-accent-track: var(--story-track);
  --s-accent-mark: var(--story-accent);
  --s-logo: var(--story-gradient-1);
}

.story-slide--2 {
  /* The person's own colour: light type on it, white cards with dark type; the accent tile is white too, in their colour. */
  --s-accent: var(--story-paper-card);
  --s-accent-ink: var(--story-gradient-2);
  --s-accent-muted: var(--story-paper-ink-muted);
  --s-accent-track: var(--story-paper-track);
  --s-accent-mark: var(--story-gradient-2);
  --s-ink: var(--story-accent-ink);
  --s-muted: var(--story-accent-ink-muted);
  --s-track: var(--story-accent-track);
  --s-chip: var(--story-chip);

  background: var(--story-gradient-2);
}

.story-slide--3 {
  /* The person's room: white cards; the accent tile is their poster, as `tone="ink"` in the report. */
  --s-accent: var(--story-gradient-2);
  --s-accent-ink: var(--story-accent-ink);
  --s-accent-muted: var(--story-accent-ink-muted);
  --s-accent-track: var(--story-accent-track);
  --s-accent-mark: var(--story-accent-ink);
  --s-logo: var(--story-gradient-2);
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
 * The canvas is always 9:16 and sits in the middle of whatever holds it, so a tall phone shows
 * exactly the picture that gets saved. Telegram and Instagram draw the author and progress over the
 * top ~13% of a story and the reply bar over the bottom ~13%: nothing important goes there.
 *
 * The slide's type scale: six roles, all in cqmin of the root. Two weights only.
 *   figure  — the one number of the cover                          (serif)
 *   display — the person's name on the cover, as on the report's poster
 *   h1      — the headline of a slide
 *   h2      — a tile's value, the ends of a split line
 *   title   — names, list rows, the brand
 *   body    — the kicker and the line under the headline
 *   caption — tile labels, notes, axes
 */
.story-slide__canvas {
  /* Big type has the report's weight (600), so a number looks the same on the slide and on the page. */
  --s-display: 600 16cqmin / 0.95 var(--font-display);
  --s-figure: 600 24cqmin / 0.9 var(--font-display);
  --s-h1: 600 11.5cqmin / 1.02 var(--font-display);
  --s-h2: 600 6.8cqmin / 1.05 var(--font-display);
  --s-title: 500 4.2cqmin / 1.2 var(--font-sans);
  --s-body: 400 3.8cqmin / 1.3 var(--font-sans);
  --s-caption: 500 3.1cqmin / 1.25 var(--font-sans);
  /* The gutter of the poster and the corner of its tiles. */
  --s-gutter: 7cqmin;
  --s-radius: 4.4cqmin;
  /* Tiles come in one after another. */
  --s-stagger: calc(var(--duration-chart) / 10);

  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4cqmin;
  width: 100%;
  /* Exactly 9:16 even when the content runs long (an aspect-ratio box grows to fit otherwise). */
  min-height: 0;
  max-height: 100%;
  aspect-ratio: 9 / 16;
  padding: 22cqmin var(--s-gutter) 21cqmin;
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
  width: 8.8cqmin;
  height: 8.8cqmin;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--s-chip);
  box-shadow: 0 0 0 0.7cqmin var(--story-gradient-1);
  font: var(--s-title);
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
  gap: 0.4cqmin;
  min-width: 0;
}

.story-slide__heading strong,
.story-slide__heading span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-slide__heading strong {
  font: var(--s-title);
}

.story-slide__heading span {
  color: var(--s-muted);
  font: var(--s-caption);
}

/* ─── Headline ───────────────────────────────────────────────────────────── */
.story-slide__body {
  display: flex;
  /* Never shrinks under its tiles: a slide that ever runs long pushes the brand into the margin. */
  flex: 1 0 auto;
  flex-direction: column;
  gap: 4cqmin;
  min-height: 0;
}

.story-slide__head {
  display: grid;
  gap: 1.6cqmin;
}

.story-slide__kicker {
  color: var(--s-muted);
  font: var(--s-body);
}

.story-slide__title {
  overflow-wrap: break-word;
  text-wrap: balance;
}

/* The name on the cover: the poster's voice, at most two lines. */
.story-slide__display {
  display: -webkit-box;
  overflow: hidden;
  margin-bottom: 3cqmin;
  font: var(--s-display);
  letter-spacing: var(--tracking-display);
  /* Between words; a single word longer than the line is hyphenated, never cut mid-letter. */
  overflow-wrap: normal;
  hyphens: auto;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

/* A long name («Продуктовая команда») steps down so it wraps between its words. */
.story-slide__display--long {
  font-size: 11.5cqmin;
}

.story-slide__title--figure {
  font: var(--s-figure);
  letter-spacing: var(--tracking-figure);
}

.story-slide__title--h1 {
  font: var(--s-h1);
  letter-spacing: var(--tracking-h1);
}

.story-slide__title--h2 {
  font: var(--s-h2);
  letter-spacing: var(--tracking-h2);
}

.story-slide__sub {
  margin: 0;
  color: var(--s-muted);
  font: var(--s-body);
  text-wrap: pretty;
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
  gap: 2cqmin;
  min-height: 0;
}

.story-tile {
  --muted: var(--s-card-muted);
  --track: var(--s-card-track);
  --mark: var(--s-card-mark);

  display: flex;
  flex-direction: column;
  gap: 1.2cqmin;
  min-width: 0;
  padding: 3.4cqmin 4cqmin;
  border-radius: var(--s-radius);
  background: var(--s-card);
  color: var(--s-card-ink);
}

/* Three full-width tiles must still leave space for the brand in a 9:16 export. */
.story-slide.is-dense .story-slide__body {
  gap: 3cqmin;
}

.story-slide.is-dense .story-tile {
  padding-block: 2.8cqmin;
}

.story-tile.is-accent {
  --muted: var(--s-accent-muted);
  --track: var(--s-accent-track);
  --mark: var(--s-accent-mark);

  background: var(--s-accent);
  color: var(--s-accent-ink);
}

.story-tile.is-wide {
  grid-column: 1 / -1;
}

.story-tile__label {
  color: var(--muted);
  font: var(--s-caption);
}

.story-tile__columns .story-tile__label {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-tile__value {
  margin-top: auto;
  font: var(--s-h2);
  letter-spacing: var(--tracking-h2);
  overflow-wrap: break-word;
}

.story-tile__value.is-long {
  font: var(--s-title);
}

.story-tile__note {
  color: var(--muted);
  font: var(--s-caption);
}

/* The pulse of the cover lies on the field itself, like a signature, not in a card. */
.story-tile--pulse {
  --muted: var(--s-muted);
  --track: var(--s-track);

  padding: 0;
  background: none;
  color: var(--s-ink);
}

.story-slide.is-dense .story-tile--pulse {
  padding-block: 0 1cqmin;
}

/* Sized in cq units by its box; the chart fills it. */
.story-tile__pulse {
  --you: currentColor;
  --them: var(--s-them);
  --border-strong: var(--track);

  height: 12cqmin;
}

.story-tile__pulse :deep(.seismograph) {
  height: 100% !important;
}

.story-tile__pulse :deep(line) {
  stroke-width: 0.55cqmin;
}

/* Chapters under the pulse: a hairline per chapter, the busiest one in the accent. */
.story-tile__chapters {
  display: flex;
  gap: 0.8cqmin;
  margin: 0;
  padding: 0;
  color: var(--muted);
  font: var(--s-caption);
  list-style: none;
}

.story-tile__chapters li {
  flex-basis: 0;
  min-width: 0;
  padding-top: 1.2cqmin;
  border-top: 0.5cqmin solid var(--track);
}

.story-tile__chapters li.is-peak {
  border-top-color: var(--s-them);
  color: var(--s-ink);
}

.story-tile__chapters span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* The split line: values at the ends, you in the tile's ink, the other side in lime. */
.story-tile__split {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 2.4cqmin;
}

.story-tile__split strong {
  font: var(--s-h2);
  letter-spacing: var(--tracking-h2);
  white-space: nowrap;
}

.story-tile__split-bar {
  display: flex;
  gap: 0.8cqmin;
  height: 1.4cqmin;
}

.story-tile__split-bar i {
  flex-basis: 0;
  border-radius: var(--radius-full);
  background: currentColor;
}

.story-tile__split-bar i.is-them {
  background: var(--s-them);
}

/* Two times without a bar (a longer bar for a slower reply would read as «more»): a hairline. */
.story-tile__split.is-bare .story-tile__split-bar {
  height: 0;
  border-top: 0.3cqmin dashed var(--track);
}

.story-tile__split-names {
  display: flex;
  justify-content: space-between;
  gap: 2cqmin;
  color: var(--muted);
  font: var(--s-caption);
}

.story-tile__split-names span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-tile__duel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3cqmin;
}

.story-tile__duel div {
  display: grid;
  gap: 1cqmin;
  min-width: 0;
}

.story-tile__duel span {
  overflow: hidden;
  color: var(--muted);
  font: var(--s-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-tile__duel strong {
  font: var(--s-h2);
  letter-spacing: var(--tracking-h2);
  white-space: nowrap;
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
  font: var(--s-caption);
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
  font: var(--s-title);
}

.story-tile__rank,
.story-tile__rank-value {
  color: var(--muted);
}

.story-tile__rank-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-tile__rank-bar {
  grid-column: 2 / -1;
  height: 1.2cqmin;
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

/* The words themselves are what the reader came for: serif, one per row. */
.story-tile__columns ol {
  display: grid;
  gap: 0.6cqmin;
  margin: 1.2cqmin 0 0;
  padding: 0;
  font: var(--s-title);
  font-family: var(--font-display);
  list-style: none;
}

.story-tile__columns li {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ─── Brand: the logo on the left, the address on the right ──────────────── */
.story-slide__brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 3cqmin;
  font: var(--s-title);
}

.story-slide__brand-name {
  display: inline-flex;
  align-items: center;
  gap: 2cqmin;
  white-space: nowrap;
}

/* The app's own mark, in poster colours (it reads the theme's tile tokens otherwise). */
.story-slide__brand-mark {
  --tile-ink: var(--s-logo);
  --on-tile-ink: var(--story-ink);
  --lime: var(--story-accent);

  width: 6.4cqmin;
  height: 6.4cqmin;
}

.story-slide__site {
  overflow: hidden;
  color: var(--s-muted);
  font: var(--s-body);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ─── Entrance: headline first, then the tiles one by one ────────────────── */
.story-slide:not(.is-still) .story-slide__head,
.story-slide:not(.is-still) .story-tile {
  animation: story-rise var(--duration-sheet) var(--ease-standard) both;
}

.story-slide:not(.is-still) .story-tile:nth-child(1) {
  animation-delay: calc(var(--s-stagger) * 1.5);
}

.story-slide:not(.is-still) .story-tile:nth-child(2) {
  animation-delay: calc(var(--s-stagger) * 2.5);
}

.story-slide:not(.is-still) .story-tile:nth-child(3) {
  animation-delay: calc(var(--s-stagger) * 3.5);
}

.story-slide:not(.is-still) .story-tile:nth-child(n + 4) {
  animation-delay: calc(var(--s-stagger) * 4.5);
}

/* The hours rise left to right after the tiles, about a sixth of a step apart. */
.story-slide:not(.is-still) .story-tile__bars span {
  transform-origin: bottom;
  animation: story-grow var(--duration-chart) var(--ease-standard) both;
  animation-delay: calc(var(--s-stagger) * (4.5 + var(--bar, 0) / 6));
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

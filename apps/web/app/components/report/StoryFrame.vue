<script setup lang="ts">
import type { StoryFrameModel, StoryWho } from '../../composables/useStoryFrames'

/**
 * One frame of «Итоги», in the manner of a poster: one giant figure in ink on the person's poster colour,
 * as large as its width allows on one line, the card's small name above it, the answer under it and the
 * picture of the finding (the pulse, the split of the balance, the hours of the day, the chips of words).
 *
 * Every size is in cqw of the root, which is the size container, so the frame is the same picture at
 * any width; the root itself has no property in cq units (html2canvas would resolve them against its
 * own viewport and the export would shift). The figure is fitted by its text length (like the report's
 * poster name), never measured after render, so the saved 1080 × 1920 `still` matches the screen.
 */
const props = defineProps<{ frame: StoryFrameModel; who: StoryWho; still?: boolean }>()

/**
 * The figure as lines, never cut inside a word: «190 дней» stands as «190» over «дней», a name as its words.
 * `chars` is the longest line's length, the size the figure is fitted by.
 */
/**
 * The width of a text in em of Onest 600 at the figure's tracking: digits and dashes are narrower than letters, capitals
 * and emoji wider, quotes narrowest; the emoji's joiners and variation selectors take no room of their own.
 */
const widthOf = (text: string) =>
  [...text].reduce((sum, char) => {
    if (char === '‍' || char === '️') return sum
    if (/\p{Extended_Pictographic}/u.test(char)) return sum + 1
    if (/[\d–⁠]/u.test(char)) return sum + 0.5
    if (/[«»"“”]/u.test(char)) return sum + 0.36
    if (/\s/u.test(char)) return sum + 0.25
    return sum + (/\p{Lu}/u.test(char) ? 0.7 : 0.6)
  }, 0)

/** A name as at most two lines of whole words, split where the wider of the two lines is the narrowest. */
function balancedLines(words: string[]): string[] {
  if (words.length < 2) return words
  let best: string[] = [words.join(' ')]
  let bestWidth = widthOf(best[0]!)
  for (let at = 1; at < words.length; at++) {
    const pair = [words.slice(0, at).join(' '), words.slice(at).join(' ')]
    const width = Math.max(...pair.map(widthOf))
    if (width < bestWidth) {
      best = pair
      bestWidth = width
    }
  }
  return best
}

const figure = computed(() => {
  const frame = props.frame
  const text = frame.kind === 'cover' ? frame.title : (frame.figure ?? '')
  const words = text.split(/\s+/u).filter(Boolean)
  // A number with its unit stands as two lines («190» over «дней»), a run of them in pairs («1 д» over «17 ч»), a split
  // as «52» over «на 48».
  const stacked = frame.kind === 'streak' || frame.kind === 'record' || frame.kind === 'balance'
  const lines =
    frame.kind === 'cover'
      ? balancedLines(words)
      : stacked && words.length === 2
        ? words
        : frame.kind === 'balance' && words.length === 3
          ? [words[0]!, `${words[1]} ${words[2]}`]
          : stacked && words.length > 2 && words.length % 2 === 0
            ? Array.from({ length: words.length / 2 }, (_, index) => `${words[index * 2]} ${words[index * 2 + 1]}`)
            : [text]
  const chars = Math.max(1, ...lines.map(widthOf))
  return { lines, chars, max: lines.length > 1 ? '30cqw' : '44cqw' }
})
</script>

<template>
  <div class="frame" :class="[`frame--${frame.kind}`, { 'frame--still': still }]">
    <div class="frame__body">
      <p class="who">
        <span class="who__faces">
          <UiAvatar v-if="who.me" :title="who.me.name" side="mine" :initial="who.me.initial" />
          <UiAvatar :title="who.name" :seed="who.chatId" on-poster />
        </span>
        {{ who.label }}
      </p>

      <template v-if="frame.kind === 'emoji'">
        <p class="frame__label">{{ frame.label }}</p>
        <p class="frame__emoji" aria-hidden="true">{{ frame.figure }}</p>
      </template>
      <template v-else-if="frame.kind !== 'summary'">
        <p class="frame__label">{{ frame.label }}</p>
      </template>

      <template v-if="frame.kind === 'summary'">
        <h2 class="frame__title frame__title--sum">{{ frame.title }}</h2>
        <dl v-if="frame.kind === 'summary'" class="visual facts">
          <div v-for="fact in frame.facts" :key="fact.key" class="facts__item">
            <dt class="facts__label">{{ fact.label }}</dt>
            <dd class="facts__value" :style="{ '--chars': Math.max(1, widthOf(fact.value)) }">{{ fact.value }}</dd>
          </div>
        </dl>
      </template>
      <template v-else-if="frame.kind === 'cover'">
        <h2 class="frame__title frame__figure" :style="{ '--chars': figure.chars, '--max': figure.max }">
          <span v-for="line in figure.lines" :key="line" class="frame__line">{{ line }}</span>
        </h2>
        <p class="frame__sub">{{ frame.sub }}</p>
        <Pulse class="cover__pulse" :data="frame.days" :bars="44" :height="0" />
      </template>
      <template v-else>
        <p
          v-if="frame.figure && frame.kind !== 'emoji'"
          class="frame__figure"
          :style="{ '--chars': figure.chars, '--max': figure.max }"
        >
          <span v-for="line in figure.lines" :key="line" class="frame__line">{{ line }}</span>
        </p>
        <h2 class="frame__title">{{ frame.title }}</h2>

        <div v-if="frame.kind === 'balance'" class="visual visual--rows">
          <div v-for="(row, position) in frame.rows" :key="row.key" class="row" :class="{ 'row--lead': !position }">
            <p v-if="position" class="row__label">{{ row.label }}</p>
            <div class="row__track" aria-hidden="true">
              <i
                class="row__mine"
                :style="{ flex: `${Math.max(row.mine, 0.001) / (row.mine + row.theirs || 1)} 1 0` }"
              />
              <i
                class="row__theirs"
                :style="{ flex: `${Math.max(row.theirs, 0.001) / (row.mine + row.theirs || 1)} 1 0` }"
              />
            </div>
            <p class="row__values">
              <b>{{ row.left }}</b>
              <b class="row__them">{{ row.right }}</b>
            </p>
          </div>
        </div>

        <div v-else-if="frame.kind === 'time'" class="visual hours" aria-hidden="true">
          <i
            v-for="(value, hour) in frame.hours"
            :key="hour"
            :class="{ 'is-peak': frame.peak.includes(hour) }"
            :style="{ height: `${Math.max(4, Math.round(value * 100))}%` }"
          />
        </div>

        <div v-else-if="frame.kind === 'words'" class="visual visual--words">
          <div v-for="side in frame.sides" :key="side.key" class="side">
            <p v-if="side.label" class="side__label">{{ side.label }}</p>
            <ul class="pills">
              <li v-for="item in side.items" :key="item" class="pill">{{ item }}</li>
            </ul>
          </div>
        </div>

        <div v-else-if="frame.kind === 'emoji'" class="visual visual--pills">
          <ul class="pills">
            <li v-for="item in frame.emoji.slice(1)" :key="item.value" class="pill">
              <span class="pill__emoji">{{ item.value }}</span
              >{{ item.count }}
            </li>
          </ul>
        </div>

        <ul v-else-if="frame.kind === 'people'" class="visual cast">
          <li v-for="member in frame.members" :key="member.id" class="cast__person">
            <UiAvatar :title="member.name" :seed="member.id" :side="member.self ? 'mine' : null" on-poster />
            <span class="cast__name">{{ member.name }}</span>
            <span class="cast__role">{{ member.role }}</span>
            <b class="cast__share">{{ member.share }}</b>
          </li>
        </ul>
      </template>
    </div>
    <p v-if="still" class="frame__mark"><BrandMark />TG Analyzer</p>
  </div>
</template>

<style scoped>
/*
 * The frame's own scale, in cqw of the root (390 px wide on a phone: 1cqw ≈ 3.9 px). A few type roles
 * and one step of space; nothing here reads the page's px tokens for size.
 */
.frame {
  container-type: inline-size;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--poster);
  background-image: var(--poster-image);
  color: var(--on-poster);
}

.frame__body {
  --f-title: 600 5.1cqw / 1.4 var(--font-sans);
  --f-ui: 500 3.85cqw / 1.35 var(--font-sans);
  --f-small: 400 3.6cqw / 1.45 var(--font-sans);
  --f-emoji: 6cqw / 1 var(--font-sans);
  --f-sum: 600 10cqw / 1.05 var(--font-sans);
  --f-fact: 600 9cqw / 1.05 var(--font-sans);
  --f-big-emoji: 45cqw;
  --f-1: 1cqw;
  --pulse-you: var(--on-poster);
  --pulse-them: var(--on-them);
  --pulse-half: 14cqw;
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: calc(var(--f-1) * 2);
  /* Under the bar of the player, above its two buttons. */
  padding: calc(var(--f-1) * 34) calc(var(--f-1) * 6) calc(var(--f-1) * 24);
}

/* The saved picture: the same composition, clear of the app's top bar and reply field. */
.frame--still .frame__body {
  padding: calc(var(--f-1) * 22) calc(var(--f-1) * 6) calc(var(--f-1) * 32);
}

.who {
  display: flex;
  align-items: center;
  gap: calc(var(--f-1) * 2);
  padding-bottom: calc(var(--f-1) * 4);
  font: var(--f-ui);
}

.who__faces {
  display: inline-flex;
}

.who__faces :deep(.avatar) {
  --avatar-size: 6.2cqw;
}

.who__faces > :nth-child(2) {
  margin-left: calc(var(--f-1) * -1.5);
}

/* The card's name sits over the figure; the figure and what follows sink to the lower part of the frame. */
.frame__label {
  margin-top: auto;
  color: var(--on-poster-muted);
  font: var(--f-ui);
}

/*
 * The figure, fitted to the frame's width on one line: its longest line sets the size (--chars is its width in em), so a word is never cut. The frame body is 88cqw wide.
 */
.frame__figure {
  --fit: clamp(9cqw, calc(84cqw / var(--chars, 1)), var(--max, 40cqw));
  margin-bottom: calc(var(--f-1) * 2);
  font-size: var(--fit);
  font-weight: 600;
  line-height: 0.95;
  letter-spacing: var(--tracking-figure);
  overflow-wrap: normal;
}

.frame__line {
  display: block;
  white-space: nowrap;
}

.frame__title {
  font: var(--f-title);
  letter-spacing: var(--tracking-h3);
  text-wrap: balance;
}

.frame__title.frame__figure {
  font-size: var(--fit);
  font-weight: 600;
  line-height: 0.95;
  letter-spacing: var(--tracking-figure);
}

.frame__title--sum {
  font: var(--f-sum);
  letter-spacing: var(--tracking-display);
}

.frame__sub {
  color: var(--on-poster-muted);
  font: var(--f-ui);
}

.frame__emoji {
  margin: calc(var(--f-1) * 2) 0 calc(var(--f-1) * 3);
  font-size: var(--f-big-emoji);
  line-height: 1;
}

/* The picture of the finding, under the answer. */
.visual {
  display: flex;
  flex-direction: column;
  margin-top: calc(var(--f-1) * 5);
}

/* The pulse runs edge to edge. */
.cover__pulse {
  width: auto;
  margin: calc(var(--f-1) * 6) calc(var(--f-1) * -6) 0;
  gap: calc(var(--f-1) * 0.5);
}

.cover__pulse :deep(.pulse__half) {
  gap: calc(var(--f-1) * 0.5);
}

/* Balance: a bar split between you (ink) and them, the two values. */
.visual--rows {
  gap: calc(var(--f-1) * 4);
}

.row {
  display: flex;
  flex-direction: column;
  gap: calc(var(--f-1) * 1.5);
}

.row__label {
  color: var(--on-poster-muted);
  font: var(--f-ui);
}

.row__track {
  display: flex;
  gap: calc(var(--f-1) * 1);
  height: calc(var(--f-1) * 2);
}

.row--lead .row__track {
  height: calc(var(--f-1) * 4);
}

.row__track i {
  min-width: calc(var(--f-1) * 1);
  border-radius: var(--radius-pill);
}

.row__mine {
  background: var(--on-poster);
}

.row__theirs {
  background: var(--on-them);
}

.row__values {
  display: flex;
  justify-content: space-between;
  gap: calc(var(--f-1) * 3);
  font: var(--f-ui);
}

.row--lead .row__values {
  font: var(--f-title);
  letter-spacing: var(--tracking-h3);
}

.row__them {
  color: var(--on-them);
}

/* The day as 24 bars: the usual hours in ink, the rest faint. */
.hours {
  flex-direction: row;
  gap: calc(var(--f-1) * 0.6);
  align-items: flex-end;
  height: calc(var(--f-1) * 20);
}

.hours i {
  flex: 1;
  border-radius: calc(var(--f-1) * 0.6);
  background: var(--on-them);
  opacity: 0.45;
}

.hours i.is-peak {
  background: var(--on-poster);
  opacity: 1;
}

/* Words: chips of each side. */
.visual--words {
  gap: calc(var(--f-1) * 5);
}

.side {
  display: flex;
  flex-direction: column;
  gap: calc(var(--f-1) * 2);
}

.side__label {
  color: var(--on-poster-muted);
  font: var(--f-ui);
}

.pills {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--f-1) * 2);
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--f-1) * 1.5);
  max-width: 100%;
  padding: calc(var(--f-1) * 1) calc(var(--f-1) * 3);
  border-radius: var(--radius-pill);
  background: var(--on-poster-chip);
  font: var(--f-ui);
  font-weight: 600;
  overflow-wrap: anywhere;
}

.pill__emoji {
  font: var(--f-emoji);
}

/* Everything together: the pair at the top, facts in two columns at the foot, each a big value over its name. */
.facts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: calc(var(--f-1) * 7) calc(var(--f-1) * 4);
  margin-top: auto;
}

.facts__item {
  display: flex;
  flex-direction: column-reverse;
  gap: calc(var(--f-1) * 1);
  min-width: 0;
}

.facts__label {
  color: var(--on-poster-muted);
  font: var(--f-ui);
}

.facts__value {
  font: var(--f-fact);
  /* Fitted to its column (about 42cqw of the 88cqw body) by its length, like the figure: a long word is smaller, not cut. */
  --fit: min(9cqw, calc(42cqw / var(--chars, 1)));
  font-size: var(--fit);
  letter-spacing: var(--tracking-display);
  white-space: nowrap;
}

/* The members, bigger: a face, a name with a role, a share. */
.cast {
  gap: calc(var(--f-1) * 3);
}

.cast :deep(.avatar) {
  --avatar-size: 12cqw;
}

.cast__person {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-areas:
    'face name share'
    'face role share';
  column-gap: calc(var(--f-1) * 3);
  align-items: center;
}

.cast__person > :first-child {
  grid-area: face;
}

.cast__name {
  grid-area: name;
  overflow: hidden;
  font: var(--f-title);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cast__share {
  grid-area: share;
  font: var(--f-title);
  font-weight: 600;
}

.cast__role {
  grid-area: role;
  color: var(--on-poster-muted);
  font: var(--f-small);
}

/* The saved picture is signed at the foot, inside the safe zone. */
.frame__mark {
  --f-mark: 500 3.6cqw / 1 var(--font-sans);
  --f-mark-gap: 2cqw;
  position: absolute;
  right: 0;
  bottom: 22cqw;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--f-mark-gap);
  font: var(--f-mark);
}

.frame__mark :deep(svg) {
  width: 5cqw;
  height: 5cqw;
}

/* The frame arrives: the title first, the picture after it. */
@media (prefers-reduced-motion: no-preference) {
  .frame:not(.frame--still) .frame__body > * {
    animation: frame-in var(--duration-sheet) var(--ease-standard) both;
  }

  .frame:not(.frame--still) .frame__body > :nth-child(n + 4) {
    animation-delay: var(--duration-fast);
  }
}

@keyframes frame-in {
  from {
    opacity: 0;
    transform: translateY(2cqw);
  }
}
</style>

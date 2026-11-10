<script setup lang="ts">
import type { StoryFrameModel, StoryWho } from '../../composables/useStoryFrames'

/**
 * One frame of «Итоги»: who it is about, the card's name, one big thought — a figure or a word and the
 * answer under it — and the picture of it filling the rest of the screen: the pulse, the bars of the
 * balance, the clock face of the day, the chips of words, the faces of a group. All on the person's
 * poster colour, in ink and their deep tone.
 *
 * Every size is in cqw of the root, which is the size container, so the frame is the same picture at
 * any width; the root itself has no property in cq units (html2canvas would resolve them against its
 * own viewport and the export would shift). `still` is the saved 1080 × 1920 picture: no motion, the
 * same composition, the mark at the foot.
 */
defineProps<{ frame: StoryFrameModel; who: StoryWho; still?: boolean }>()

/** A tick of the clock face: its angle and how far it reaches. */
const tick = (value: number, hour: number) => ({
  transform: `rotate(${hour * 15}deg)`,
  '--tick': String(0.25 + value * 0.75),
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

      <template v-if="frame.kind === 'cover'">
        <div class="visual visual--pulse">
          <Pulse class="cover__pulse" :data="frame.days" :bars="36" :height="0" />
        </div>
        <h2 class="frame__title frame__title--name">{{ frame.title }}</h2>
        <p class="frame__sub">{{ frame.sub }}</p>
        <p v-if="frame.meta" class="frame__meta">{{ frame.meta }}</p>
      </template>

      <template v-else>
        <p class="frame__label">{{ frame.label }}</p>
        <p v-if="frame.figure" class="frame__figure" :class="{ 'frame__figure--word': frame.kind === 'words' }">
          {{ frame.figure }}
        </p>
        <h2 class="frame__title">{{ frame.title }}</h2>

        <div v-if="frame.kind === 'balance'" class="visual visual--rows">
          <div v-for="(row, position) in frame.rows" :key="row.key" class="row" :class="{ 'row--lead': !position }">
            <p class="row__label">{{ row.label }}</p>
            <div class="row__track" aria-hidden="true">
              <i class="row__mine" :style="{ flex: Math.max(row.mine, 0.001) }" />
              <i class="row__theirs" :style="{ flex: Math.max(row.theirs, 0.001) }" />
            </div>
            <p class="row__values">
              <b>{{ row.left }}</b>
              <b class="row__them">{{ row.right }}</b>
            </p>
          </div>
        </div>

        <div v-else-if="frame.kind === 'time'" class="visual visual--dial">
          <div class="dial" aria-hidden="true">
            <span v-for="mark in [0, 6, 12, 18]" :key="mark" class="dial__mark" :class="`dial__mark--${mark}`">{{
              mark
            }}</span>
            <i
              v-for="(value, hour) in frame.hours"
              :key="hour"
              class="dial__tick"
              :class="{ 'is-peak': frame.peak.includes(hour) }"
              :style="tick(value, hour)"
            />
          </div>
        </div>

        <div v-else-if="frame.kind === 'words'" class="visual visual--words">
          <div v-for="side in frame.sides" :key="side.key" class="side">
            <p v-if="side.label" class="side__label">{{ side.label }}</p>
            <ul class="pills">
              <li v-for="item in side.items" :key="item" class="pill">{{ item }}</li>
            </ul>
          </div>
          <ul v-if="frame.emoji.length" class="pills">
            <li v-for="item in frame.emoji" :key="item.value" class="pill">
              <span class="pill__emoji">{{ item.value }}</span
              >{{ item.count }}
            </li>
          </ul>
        </div>

        <ul v-else-if="frame.kind === 'people'" class="visual cast">
          <li v-for="member in frame.members" :key="member.id" class="cast__person">
            <UiAvatar :title="member.name" :seed="member.id" :side="member.self ? 'mine' : null" on-poster />
            <span class="cast__name"
              >{{ member.name }}<b class="cast__share">{{ member.share }}</b></span
            >
            <span class="cast__role">{{ member.role }}</span>
          </li>
        </ul>
      </template>
    </div>
    <p v-if="still" class="frame__mark"><BrandMark />TG Analyzer</p>
  </div>
</template>

<style scoped>
/*
 * The frame's own scale, in cqw of the root (390 px wide on a phone: 1cqw ≈ 3.9 px). Four type roles
 * and one step of space; nothing here reads the page's px tokens for size.
 */
.frame {
  container-type: inline-size;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--poster);
  color: var(--on-poster);
}

.frame__body {
  --f-figure: 600 30cqw / 1 var(--font-sans);
  --f-word: 600 15cqw / 1.05 var(--font-sans);
  --f-display: 600 14.4cqw / 1 var(--font-sans);
  --f-answer: 600 8cqw / 1.15 var(--font-sans);
  --f-title: 600 5.1cqw / 1.4 var(--font-sans);
  --f-body: 400 4.1cqw / 1.5 var(--font-sans);
  --f-ui: 500 3.85cqw / 1.35 var(--font-sans);
  --f-small: 400 3.6cqw / 1.45 var(--font-sans);
  --f-caption: 500 2.8cqw / 1.3 var(--font-sans);
  --f-emoji: 6cqw / 1 var(--font-sans);
  --f-1: 1cqw;
  --pulse-you: var(--on-poster);
  --pulse-them: var(--on-them);
  --pulse-half: 24cqw;
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
  padding: calc(var(--f-1) * 26) calc(var(--f-1) * 6) calc(var(--f-1) * 34);
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

.frame__label {
  color: var(--on-poster-muted);
  font: var(--f-ui);
}

/* One big figure or word, the answer under it. */
.frame__figure {
  overflow-wrap: anywhere;
  font: var(--f-figure);
  letter-spacing: var(--tracking-figure);
}

.frame__figure--word {
  font: var(--f-word);
  letter-spacing: var(--tracking-display);
}

.frame__title {
  overflow: hidden;
  font: var(--f-answer);
  letter-spacing: var(--tracking-h2);
  overflow-wrap: anywhere;
  text-wrap: balance;
}

.frame__figure + .frame__title {
  font: var(--f-title);
  letter-spacing: var(--tracking-h3);
}

.frame__title--name {
  font: var(--f-display);
  letter-spacing: var(--tracking-display);
}

.frame__sub {
  font: var(--f-title);
  letter-spacing: var(--tracking-h3);
}

.frame__meta {
  color: var(--on-poster-muted);
  font: var(--f-small);
}

/* The picture takes whatever height the frame has left, so a tall screen is never half empty. */
.visual {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
}

.cover__pulse {
  gap: calc(var(--f-1) * 0.5);
}

.cover__pulse :deep(.pulse__half) {
  gap: calc(var(--f-1) * 0.5);
}

/* Balance: rows of a label, a bar split between you (ink) and them, the two values. */
.visual--rows {
  gap: calc(var(--f-1) * 8);
}

.row {
  display: flex;
  flex-direction: column;
  gap: calc(var(--f-1) * 2);
}

.row__label {
  color: var(--on-poster-muted);
  font: var(--f-ui);
}

.row__track {
  display: flex;
  gap: calc(var(--f-1) * 1);
  height: calc(var(--f-1) * 3);
}

.row--lead .row__track {
  height: calc(var(--f-1) * 8);
}

.row__track i {
  min-width: calc(var(--f-1) * 1);
  border-radius: var(--radius-full);
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
  font: var(--f-title);
  letter-spacing: var(--tracking-h3);
}

.row--lead .row__values {
  font: var(--f-answer);
  letter-spacing: var(--tracking-h2);
}

.row__them {
  color: var(--on-them);
}

/* The day as a clock face: 24 ticks from the centre, as long as the hour is busy, the usual hours in ink. */
.visual--dial {
  align-items: center;
}

.dial {
  position: relative;
  width: calc(var(--f-1) * 66);
  height: calc(var(--f-1) * 66);
}

.dial__tick {
  position: absolute;
  top: 0;
  left: calc(50% - var(--f-1) * 0.9);
  width: calc(var(--f-1) * 1.8);
  height: 50%;
  transform-origin: 50% 100%;
}

.dial__tick::before {
  content: '';
  position: absolute;
  right: 0;
  bottom: 18%;
  left: 0;
  height: calc(80% * var(--tick));
  border-radius: var(--radius-full);
  background: var(--on-them);
  opacity: 0.45;
}

.dial__tick.is-peak::before {
  background: var(--on-poster);
  opacity: 1;
}

.dial__mark {
  position: absolute;
  color: var(--on-poster-muted);
  font: var(--f-ui);
}

.dial__mark--0 {
  top: calc(var(--f-1) * -7);
  left: 50%;
  transform: translateX(-50%);
}

.dial__mark--12 {
  bottom: calc(var(--f-1) * -7);
  left: 50%;
  transform: translateX(-50%);
}

.dial__mark--6 {
  top: 50%;
  right: calc(var(--f-1) * -7);
  transform: translateY(-50%);
}

.dial__mark--18 {
  top: 50%;
  left: calc(var(--f-1) * -8);
  transform: translateY(-50%);
}

/* Words: chips of each side, then the favourite emoji. */
.visual--words {
  gap: calc(var(--f-1) * 7);
}

.side {
  display: flex;
  flex-direction: column;
  gap: calc(var(--f-1) * 2.5);
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
  padding: calc(var(--f-1) * 1.5) calc(var(--f-1) * 3.5);
  border-radius: var(--radius-full);
  background: var(--on-poster-chip);
  font: var(--f-title);
  overflow-wrap: anywhere;
}

.pill__emoji {
  font: var(--f-emoji);
}

/* A class photo: four faces, each with a name, a share and a role. */
.cast {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-content: center;
  gap: calc(var(--f-1) * 8) calc(var(--f-1) * 2);
}

.cast :deep(.avatar) {
  --avatar-size: 22cqw;
}

.cast__person {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--f-1) * 1);
  min-width: 0;
  text-align: center;
}

.cast__name {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--f-1) * 2);
  max-width: 100%;
  padding-top: calc(var(--f-1) * 1);
  font: var(--f-body);
  font-weight: 500;
}

.cast__share {
  padding: 0 calc(var(--f-1) * 1.5);
  border-radius: var(--radius-full);
  background: var(--on-poster);
  color: var(--poster);
  font: var(--f-caption);
}

.cast__role {
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

  .frame:not(.frame--still) .frame__body > :nth-child(n + 3) {
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

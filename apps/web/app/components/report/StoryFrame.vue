<script setup lang="ts">
import type { StoryFrameModel, StoryWho } from '../../composables/useStoryFrames'

/**
 * One frame of «Итоги»: who it is about, the finding as a title, its picture — the pulse, a dialogue of
 * bubbles, the clock face of the day, the top words, a class photo of a group — and a line or two.
 * All on the person's poster colour, in ink and their deep tone.
 *
 * Every size is in cqw of the root, which is the size container, so the frame is the same picture at
 * any width; the root itself has no property in cq units (html2canvas would resolve them against its
 * own viewport and the export would shift). `still` is the saved 1080 × 1920 picture: no motion, the
 * content inside the stories' safe zone, the mark at the foot.
 */
defineProps<{ frame: StoryFrameModel; who: StoryWho; still?: boolean }>()

/** «[[…]]» marks the part of a line said in ink. */
const parts = (line: string) =>
  line
    .split(/(\[\[.*?\]\])/u)
    .filter(Boolean)
    .map((text) => (text.startsWith('[[') ? { text: text.slice(2, -2), strong: true } : { text, strong: false }))

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
        <Pulse class="cover__pulse" :data="frame.days" :bars="36" :height="0" />
        <h2 class="frame__title">{{ frame.title }}</h2>
        <p class="frame__sub">{{ frame.sub }}</p>
        <p v-if="frame.meta" class="frame__meta">{{ frame.meta }}</p>
      </template>

      <template v-else>
        <h2 class="frame__title">{{ frame.title }}</h2>
        <p v-if="frame.sub" class="frame__sub">{{ frame.sub }}</p>
      </template>

      <ul v-if="frame.kind === 'together'" class="bubbles">
        <li v-for="bubble in frame.bubbles" :key="bubble.text" class="bubble" :class="`bubble--${bubble.side}`">
          {{ bubble.text }}
        </li>
      </ul>

      <template v-else-if="frame.kind === 'time'">
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
          <span class="dial__center">
            <b>{{ frame.window }}</b>
            <span>{{ frame.caption }}</span>
          </span>
        </div>
        <ul class="pills">
          <li v-for="part in frame.parts" :key="part.key" class="pill" :class="{ 'pill--on': part.on }">
            {{ part.text }}
          </li>
        </ul>
      </template>

      <template v-else-if="frame.kind === 'words'">
        <ol v-if="frame.list.length" class="top">
          <li v-for="item in frame.list" :key="item.word">
            <span class="top__place">{{ item.place }}</span>
            <b class="top__word">{{ item.word }}</b>
            <span class="top__count">{{ item.count }}</span>
          </li>
        </ol>
        <ul v-if="frame.emoji.length" class="pills">
          <li v-for="item in frame.emoji" :key="item.value" class="pill">
            <span class="pill__emoji">{{ item.value }}</span
            >{{ item.count }}
          </li>
        </ul>
      </template>

      <ul v-else-if="frame.kind === 'people'" class="cast">
        <li v-for="member in frame.members" :key="member.id" class="cast__person">
          <UiAvatar :title="member.name" :seed="member.id" :side="member.self ? 'mine' : null" on-poster />
          <span class="cast__name"
            >{{ member.name }}<b class="cast__share">{{ member.share }}</b></span
          >
          <span class="cast__role">{{ member.role }}</span>
        </li>
      </ul>

      <div v-if="frame.lines.length" class="lines">
        <p v-for="line in frame.lines" :key="line">
          <template v-for="(part, index) in parts(line)" :key="index">
            <b v-if="part.strong">{{ part.text }}</b>
            <template v-else>{{ part.text }}</template>
          </template>
        </p>
      </div>
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
  --f-display: 600 14.4cqw / 1 var(--font-sans);
  --f-title: 600 5.1cqw / 1.4 var(--font-sans);
  --f-body: 400 4.1cqw / 1.5 var(--font-sans);
  --f-ui: 500 3.85cqw / 1.35 var(--font-sans);
  --f-small: 400 3.6cqw / 1.45 var(--font-sans);
  --f-caption: 500 2.8cqw / 1.3 var(--font-sans);
  --f-emoji: 4.6cqw / 1 var(--font-sans);
  --f-1: 1cqw;
  --pulse-you: var(--on-poster);
  --pulse-them: var(--on-them);
  --pulse-half: 15.4cqw;
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: calc(var(--f-1) * 2);
  /* Under the bar of the player, above its two buttons. */
  padding: calc(var(--f-1) * 34) calc(var(--f-1) * 4.1) calc(var(--f-1) * 24);
}

/* The saved picture: the stories' safe zone — clear of the app's top bar and reply field. */
.frame--still .frame__body {
  justify-content: center;
  padding: calc(var(--f-1) * 26) calc(var(--f-1) * 6) calc(var(--f-1) * 36);
}

.who {
  display: flex;
  align-items: center;
  gap: calc(var(--f-1) * 2);
  padding-bottom: calc(var(--f-1) * 2);
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

.frame__title {
  overflow: hidden;
  font: var(--f-display);
  letter-spacing: var(--tracking-display);
  overflow-wrap: anywhere;
  padding-bottom: calc(var(--f-1) * 1.5);
}

.frame__sub {
  font: var(--f-title);
  letter-spacing: var(--tracking-h3);
}

.frame__meta {
  padding-top: calc(var(--f-1) * 2);
  color: var(--on-poster-muted);
  font: var(--f-small);
}

.cover__pulse {
  gap: calc(var(--f-1) * 0.5);
  padding-bottom: calc(var(--f-1) * 6);
}

.cover__pulse :deep(.pulse__half) {
  gap: calc(var(--f-1) * 0.5);
}

/* Bubbles of a dialogue: theirs on the left in their deep tone, yours on the right in ink. */
.bubbles {
  display: flex;
  flex-direction: column;
  gap: calc(var(--f-1) * 1);
  padding: calc(var(--f-1) * 2) 0 calc(var(--f-1) * 3);
}

.bubble {
  max-width: 88%;
  padding: calc(var(--f-1) * 2.2) calc(var(--f-1) * 3);
  color: var(--poster);
  font: var(--f-ui);
}

.bubble--theirs {
  align-self: flex-start;
  border-radius: calc(var(--f-1) * 5) calc(var(--f-1) * 5) calc(var(--f-1) * 5) calc(var(--f-1) * 1.5);
  background: var(--on-them);
}

.bubble--mine {
  align-self: flex-end;
  border-radius: calc(var(--f-1) * 5) calc(var(--f-1) * 5) calc(var(--f-1) * 1.5) calc(var(--f-1) * 5);
  background: var(--on-poster);
}

/* The day as a clock face: 24 ticks from the centre, as long as the hour is busy, the usual hours in ink. */
.dial {
  position: relative;
  align-self: center;
  width: calc(var(--f-1) * 46);
  height: calc(var(--f-1) * 46);
  margin: calc(var(--f-1) * 3) 0;
}

.dial__tick {
  position: absolute;
  top: 0;
  left: calc(50% - var(--f-1) * 0.5);
  width: calc(var(--f-1) * 1);
  height: 50%;
  transform-origin: 50% 100%;
}

.dial__tick::before {
  content: '';
  position: absolute;
  right: 0;
  bottom: 42%;
  left: 0;
  height: calc(46% * var(--tick));
  border-radius: var(--radius-full);
  background: var(--on-them);
  opacity: 0.45;
}

.dial__tick.is-peak::before {
  background: var(--on-poster);
  opacity: 1;
}

.dial__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--on-poster-muted);
  font: var(--f-caption);
}

.dial__center b {
  color: var(--on-poster);
  font: var(--f-title);
  font-weight: 600;
  letter-spacing: var(--tracking-h2);
}

.dial__mark {
  position: absolute;
  color: var(--on-poster-muted);
  font: var(--f-caption);
}

.dial__mark--0 {
  top: calc(var(--f-1) * -5);
  left: 50%;
  transform: translateX(-50%);
}

.dial__mark--12 {
  bottom: calc(var(--f-1) * -5);
  left: 50%;
  transform: translateX(-50%);
}

.dial__mark--6 {
  top: 50%;
  right: calc(var(--f-1) * -6);
  transform: translateY(-50%);
}

.dial__mark--18 {
  top: 50%;
  left: calc(var(--f-1) * -7);
  transform: translateY(-50%);
}

.pills {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--f-1) * 2);
  padding: calc(var(--f-1) * 2) 0;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: calc(var(--f-1) * 1.5);
  padding: calc(var(--f-1) * 1) calc(var(--f-1) * 3);
  border-radius: var(--radius-full);
  background: var(--on-poster-chip);
  font: var(--f-ui);
}

.pill--on {
  background: var(--on-poster);
  color: var(--poster);
}

.pill__emoji {
  font: var(--f-emoji);
}

/* Places two to five: the place, the word, how many times at the right edge. */
.top {
  display: flex;
  flex-direction: column;
  gap: calc(var(--f-1) * 1);
  padding: calc(var(--f-1) * 2) 0;
}

.top li {
  display: flex;
  align-items: baseline;
  gap: calc(var(--f-1) * 3);
}

.top__place,
.top__count {
  flex: none;
  color: var(--on-poster-muted);
  font: var(--f-small);
}

.top__place {
  width: calc(var(--f-1) * 3);
}

.top__word {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font: var(--f-title);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* A class photo: four faces, each with a name, a share and a role. */
.cast {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: calc(var(--f-1) * 4) calc(var(--f-1) * 2);
  padding: calc(var(--f-1) * 3) 0;
}

.cast :deep(.avatar) {
  --avatar-size: 16.4cqw;
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

.lines {
  display: flex;
  flex-direction: column;
  gap: calc(var(--f-1) * 0.5);
  padding-top: calc(var(--f-1) * 2);
  color: var(--on-poster-muted);
  font: var(--f-body);
}

.lines b {
  color: var(--on-poster);
  font-weight: 600;
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

/* The frame arrives: the title first, the picture and the lines after it. */
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

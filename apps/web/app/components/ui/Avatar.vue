<script setup lang="ts">
import { hueIndex } from '../../lib/hue'
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type AvatarSide = 'mine' | 'theirs'

const props = withDefaults(
  defineProps<{
    /** The person or chat name: initials, and the tooltip of a side avatar. */
    title: string | null | undefined
    src?: string | null
    /** xs 24 · sm 32 · md 40 · lg 64 · xl 72 (--avatar-*). */
    size?: AvatarSize
    /** Chat or user id; picks one of six tones. Falls back to the title. */
    seed?: string | number | null
    /**
     * One side of a two-person report: `mine` is an ink circle with «Я», `theirs` is the lime
     * avatar with the first letter of `title`. No photo, no hashed tone.
     */
    side?: AvatarSide | null
  }>(),
  {
    src: null,
    size: 'md',
    seed: null,
    side: null,
  },
)

const { t } = useI18n()

const failed = ref(false)
watch(
  () => props.src,
  () => {
    failed.value = false
  },
)

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
/** The first letter or digit of a word, as a whole grapheme (emoji flags, accents). */
function firstLetter(word: string) {
  return Array.from(graphemes.segment(word), ({ segment }) => segment).find((char) => /[\p{L}\p{N}]/u.test(char)) ?? ''
}

const initials = computed(() => {
  if (props.side === 'mine') return t('report.youInitial')
  const words = (props.title ?? '').trim().split(/\s+/u)
  if (props.side === 'theirs') return (firstLetter(words[0] ?? '') || '?').toLocaleUpperCase()
  return words.map(firstLetter).filter(Boolean).slice(0, 2).join('').toLocaleUpperCase()
})

/** Stable tone: the person's hue (lib/hue.ts), the same one their report and stories use. */
const tone = computed(() => (props.side ? null : hueIndex(props.seed ?? props.title ?? '')))

const showImage = computed(() => !props.side && props.src && !failed.value)
const tooltip = computed(() => {
  if (props.side === 'mine') return t('report.you')
  if (props.side === 'theirs') return props.title ?? undefined
  return undefined
})
</script>

<template>
  <span class="avatar" :class="[`avatar--${size}`, side ? `avatar--${side}` : `avatar--t${tone}`]" :title="tooltip">
    <img v-if="showImage" :src="src ?? undefined" alt="" @error="failed = true" />
    <span v-else aria-hidden="true">{{ initials || 'TG' }}</span>
  </span>
</template>

<style scoped>
/*
 * Size rules sit in :where() so a caller's class can still resize one avatar without a fight over
 * specificity. Initials use the interface face at 500
 * in a circle.
 */
.avatar {
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  overflow: hidden;
  border-radius: var(--radius-full);
  line-height: 1;
  user-select: none;
}

:where(.avatar) {
  --avatar-size: var(--avatar-md);
  width: var(--avatar-size);
  height: var(--avatar-size);
  font: var(--text-ui);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

:where(.avatar--xs) {
  --avatar-size: var(--avatar-xs);
  font: var(--text-caption);
}

:where(.avatar--sm) {
  --avatar-size: var(--avatar-sm);
  font: var(--text-small);
  font-weight: 500;
}

/*
 * Big circles: the initials scale with the circle (24 at 64, 27 at 72), still 500. A local
 * role until tokens.css has one (--text-initials).
 */
:where(.avatar--lg, .avatar--xl) {
  --avatar-initials: 500 calc(var(--avatar-size) * 0.375) / 1 var(--font-sans);
  font: var(--avatar-initials);
}

:where(.avatar--lg) {
  --avatar-size: var(--avatar-lg);
}

:where(.avatar--xl) {
  --avatar-size: var(--avatar-xl);
}

.avatar--t1 {
  background: var(--avatar-1-bg);
  color: var(--avatar-1-ink);
}

.avatar--t2 {
  background: var(--avatar-2-bg);
  color: var(--avatar-2-ink);
}

.avatar--t3 {
  background: var(--avatar-3-bg);
  color: var(--avatar-3-ink);
}

.avatar--t4 {
  background: var(--avatar-4-bg);
  color: var(--avatar-4-ink);
}

.avatar--t5 {
  background: var(--avatar-5-bg);
  color: var(--avatar-5-ink);
}

.avatar--t6 {
  background: var(--avatar-6-bg);
  color: var(--avatar-6-ink);
}

/* ─── Sides of a two-person report: you are ink, they are the person's hue ─ */
.avatar--mine {
  background: var(--you);
  color: var(--surface);
}

.avatar--theirs {
  background: var(--them);
  color: var(--surface);
}

/* On a poster-coloured tile «Я» is a light circle with the tile's colour inside; theirs is a well. */
.tile--ink .avatar--mine {
  color: var(--tile-ink);
}

.tile--ink .avatar--theirs {
  background: var(--on-tile-ink-well);
  color: var(--on-tile-ink);
}
</style>

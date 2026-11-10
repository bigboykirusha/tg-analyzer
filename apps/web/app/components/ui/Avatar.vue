<script setup lang="ts">
import { hueOf } from '../../lib/hue'

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg'
export type AvatarSide = 'mine' | 'theirs'

/**
 * A person: their colour as a soft vertical gradient, ink initials — as in Telegram, in the light family.
 * 24 / 32 / 40 / 64 (--avatar-*). `side` draws one side of a two-person report: `mine` is an ink circle,
 * `theirs` takes the colour of the report around it. On a person's own poster pass `on-poster`.
 */
const props = withDefaults(
  defineProps<{
    title: string | null | undefined
    src?: string | null
    size?: AvatarSize
    /** Chat or user id: picks the person's colour (lib/hue.ts). Falls back to the title. */
    seed?: string | number | null
    side?: AvatarSide | null
    onPoster?: boolean
    /** The letter to show instead of the one worked out from the title (a named «вы» in a quiz). */
    initial?: string
  }>(),
  { src: null, size: 'md', seed: null, side: null, onPoster: false, initial: '' },
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
/** The first letter or digit of a word, as a whole grapheme (accents, emoji flags). */
function firstLetter(word: string) {
  return Array.from(graphemes.segment(word), ({ segment }) => segment).find((char) => /[\p{L}\p{N}]/u.test(char)) ?? ''
}

const initials = computed(() => {
  if (props.initial) return props.initial
  if (props.side === 'mine') return t('report.youInitial')
  const words = (props.title ?? '').trim().split(/\s+/u)
  if (props.side === 'theirs') return (firstLetter(words[0] ?? '') || '?').toLocaleUpperCase()
  return words.map(firstLetter).filter(Boolean).slice(0, 2).join('').toLocaleUpperCase()
})

/** Their own colour; a side avatar inherits the report's. */
const hue = computed(() => (props.side ? undefined : hueOf(props.seed ?? props.title ?? '')))
const showImage = computed(() => !props.side && props.src && !failed.value)
const tooltip = computed(() => {
  if (props.side === 'mine') return t('report.you')
  if (props.side === 'theirs') return props.title ?? undefined
  return undefined
})
</script>

<template>
  <span
    class="avatar"
    :class="[`avatar--${size}`, { 'avatar--mine': side === 'mine', 'avatar--on-poster': onPoster }]"
    :data-hue="hue"
    :title="tooltip"
  >
    <img v-if="showImage" :src="src ?? undefined" alt="" @error="failed = true" />
    <span v-else aria-hidden="true">{{ initials || 'TG' }}</span>
  </span>
</template>

<style scoped>
.avatar {
  --avatar-size: var(--avatar-md);
  display: inline-grid;
  flex: none;
  place-items: center;
  width: var(--avatar-size);
  height: var(--avatar-size);
  overflow: hidden;
  border-radius: var(--radius-full);
  background: linear-gradient(var(--room-tint), var(--poster));
  color: var(--on-poster);
  /* Initials are 0.4 of the circle, the title weight. */
  --avatar-initials: 600 calc(var(--avatar-size) * 0.4) / 1 var(--font-sans);
  font: var(--avatar-initials);
  user-select: none;
}

.avatar--xs {
  --avatar-size: var(--avatar-xs);
}

.avatar--sm {
  --avatar-size: var(--avatar-sm);
}

.avatar--lg {
  --avatar-size: var(--avatar-lg);
}

.avatar--mine {
  background: var(--you);
  color: var(--on-you);
}

/* On the person's own poster their circle is a light well with their deep tone inside. */
.avatar--on-poster:not(.avatar--mine) {
  background: var(--avatar-on-poster);
  color: var(--on-them);
}

:root[data-theme='dark'] .avatar:not(.avatar--mine, .avatar--on-poster) {
  background: var(--poster);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>

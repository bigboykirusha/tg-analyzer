<script setup lang="ts">
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg'

const props = withDefaults(
  defineProps<{
    title: string | null | undefined
    src?: string | null
    /** xs 24 · sm 36 · md 44 · lg 64. */
    size?: AvatarSize
    /** Chat or user id; picks one of six tones. Falls back to the title. */
    seed?: string | number | null
  }>(),
  {
    src: null,
    size: 'md',
    seed: null,
  },
)

const TONES = 6

const failed = ref(false)
watch(
  () => props.src,
  () => {
    failed.value = false
  },
)

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
const initials = computed(() =>
  (props.title ?? '')
    .trim()
    .split(/\s+/u)
    .map(
      (word) =>
        Array.from(graphemes.segment(word), ({ segment }) => segment).find((char) => /[\p{L}\p{N}]/u.test(char)) ?? '',
    )
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toLocaleUpperCase(),
)

/** Stable tone: hash(id) % 6 + 1. The tone carries no meaning. */
const tone = computed(() => {
  const key = String(props.seed ?? props.title ?? '')
  let hash = 0
  for (let index = 0; index < key.length; index += 1) hash = (hash * 31 + key.charCodeAt(index)) | 0
  return (Math.abs(hash) % TONES) + 1
})
</script>

<template>
  <span class="avatar" :class="[`avatar--${size}`, `avatar--t${tone}`]">
    <img v-if="src && !failed" :src="src" alt="" @error="failed = true" />
    <span v-else aria-hidden="true">{{ initials || 'TG' }}</span>
  </span>
</template>

<style scoped>
.avatar {
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  overflow: hidden;
  width: var(--control-md);
  height: var(--control-md);
  border-radius: 50%;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar--xs {
  width: 24px;
  height: 24px;
  font-size: 10px;
}

.avatar--sm {
  width: var(--control-sm);
  height: var(--control-sm);
  font-size: 13px;
}

.avatar--lg {
  width: 64px;
  height: 64px;
  font-size: 22px;
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
</style>

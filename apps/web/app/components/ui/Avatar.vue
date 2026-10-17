<script setup lang="ts">
const props = withDefaults(
  defineProps<{ title: string | null | undefined; src?: string | null; size?: 'sm' | 'md' | 'lg' }>(),
  {
    src: null,
    size: 'md',
  },
)

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
</script>

<template>
  <span class="avatar" :class="`avatar--${size}`">
    <img v-if="src && !failed" :src="src" alt="" @error="failed = true" />
    <span v-else aria-hidden="true">{{ initials || 'TG' }}</span>
  </span>
</template>

<style scoped>
.avatar {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-full);
  background: radial-gradient(circle at 30% 30%, var(--accent-border), transparent 60%), var(--surface-2);
  color: var(--text);
  font-weight: 600;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar--sm {
  width: 32px;
  height: 32px;
  font-size: 12px;
}

.avatar--md {
  width: 44px;
  height: 44px;
  font-size: 13px;
}

.avatar--lg {
  width: 56px;
  height: 56px;
  font-size: 18px;
}
</style>

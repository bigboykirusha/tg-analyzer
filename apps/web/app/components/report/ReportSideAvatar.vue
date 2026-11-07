<script setup lang="ts">
/**
 * One side of a two-person report as a 24 px avatar: «Я» in ink for you, the first letter of the
 * name for the other side. A thin wrapper over UiAvatar's `side` mode, which also handles ink and
 * lime tiles.
 */
defineProps<{ side: 'mine' | 'theirs'; name: string }>()
</script>

<template>
  <UiAvatar class="side-avatar" :class="`side-avatar--${side}`" :side="side" :title="name" size="xs" />
</template>

<style>
/* The look lives in UiAvatar (`side` mode); `.side-avatar` stays as a hook for callers' layout rules. */
</style>

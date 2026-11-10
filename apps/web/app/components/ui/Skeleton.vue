<script setup lang="ts">
/**
 * A placeholder block. Skeleton screens are built from the real layout (the same tiles, rows and line
 * heights), so nothing moves when the content arrives. The block breathes in place — no travelling
 * shine, which smears over rounded corners and dark surfaces.
 */
/** Without `height` a block is one line of small text tall, or what the caller's class says (`1lh`). */
withDefaults(defineProps<{ width?: string; height?: string; radius?: string }>(), {
  width: '100%',
  height: undefined,
  radius: 'var(--radius-well)',
})
</script>

<template>
  <span class="skeleton" aria-hidden="true" :style="{ width, height, borderRadius: radius }" />
</template>

<style scoped>
.skeleton {
  display: block;
  height: var(--space-4);
  flex: none;
  max-width: 100%;
  background: var(--skeleton);
  animation: skeleton-breathe var(--duration-shimmer) var(--ease-loop) infinite alternate;
}

@keyframes skeleton-breathe {
  to {
    opacity: 0.55;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton {
    animation: none;
  }
}
</style>

<script setup lang="ts">
/**
 * A placeholder block. Skeleton screens are built from the real layout (the same tiles, rows and line
 * heights), so nothing moves when the content arrives. The block breathes in place — no travelling
 * shine, which smears over rounded corners and dark surfaces.
 */
withDefaults(defineProps<{ width?: string; height?: string; radius?: string }>(), {
  width: '100%',
  height: 'var(--space-4)',
  radius: 'var(--radius-xs)',
})
</script>

<template>
  <span class="skeleton" aria-hidden="true" :style="{ width, height, borderRadius: radius }" />
</template>

<style scoped>
.skeleton {
  display: block;
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

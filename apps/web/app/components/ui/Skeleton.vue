<script setup lang="ts">
withDefaults(
  defineProps<{
    width?: string
    height?: string
    radius?: string
  }>(),
  {
    width: '100%',
    height: '14px',
    radius: 'var(--radius-xs)',
  },
)
</script>

<template>
  <div class="skeleton" aria-hidden="true" :style="{ width, height, borderRadius: radius }" />
</template>

<style scoped>
.skeleton {
  position: relative;
  flex-shrink: 0;
  max-width: 100%;
  overflow: hidden;
  background: var(--surface-2);
}

.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, var(--hover), transparent);
  transform: translateX(-100%);
  animation: skeleton-shimmer 1.6s ease-in-out infinite;
}

@keyframes skeleton-shimmer {
  to {
    transform: translateX(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton::after {
    animation: none;
  }
}
</style>

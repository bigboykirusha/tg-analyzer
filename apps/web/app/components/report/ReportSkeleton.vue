<script setup lang="ts">
/**
 * The shape of a report while it loads, under the poster's own loading shape: the part navigation
 * and the first cards. The title sits in the
 * top bar like on the real report, when the chat is already known.
 */
defineProps<{ title?: string | null }>()
</script>

<template>
  <div class="stack stack--lg skeleton-report" aria-busy="true">
    <UiPageBar v-if="title" :title="title" back="/dashboard" />

    <Teleport to="#header-sub" defer>
      <UiSkeleton class="skeleton-nav" height="var(--control-sm)" radius="var(--radius-full)" />
    </Teleport>

    <div v-for="section in 2" :key="section" class="tile skeleton-section" aria-hidden="true">
      <UiSkeleton width="40%" height="var(--space-6)" />
      <UiSkeleton width="70%" />
      <UiSkeleton height="var(--bar-height)" radius="var(--radius-full)" />
      <UiSkeleton width="55%" />
      <UiSkeleton height="var(--bar-height)" radius="var(--radius-full)" />
    </div>
  </div>
</template>

<style scoped>
/* The part navigation: full width on phones, a short pill on wide screens. */
.skeleton-nav {
  width: 100%;
}

@media (min-width: 1200px) {
  .skeleton-nav {
    max-width: var(--report-nav-width);
  }
}

.skeleton-report {
  padding-top: var(--page-top);
}

.skeleton-section {
  gap: var(--space-4);
}
</style>

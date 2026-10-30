<script setup lang="ts">
/**
 * The shape of a report while it loads: the lead sentence, the ink and lime
 * tiles, the part navigation and the first sections. The title sits in the
 * top bar like on the real report, when the chat is already known.
 */
defineProps<{ title?: string | null }>()
</script>

<template>
  <div class="stack stack--lg" aria-busy="true">
    <UiPageBar v-if="title" :title="title" back="/dashboard" />

    <div class="skeleton-lead">
      <UiSkeleton width="100%" height="24px" />
      <UiSkeleton width="82%" height="24px" />
      <UiSkeleton width="48%" height="24px" />
    </div>

    <div class="bento" aria-hidden="true">
      <div class="tile span-8 skeleton-tile">
        <UiSkeleton width="30%" />
        <UiSkeleton width="45%" height="48px" />
        <UiSkeleton class="skeleton-tile__foot" height="96px" />
      </div>
      <div class="tile span-4 skeleton-tile">
        <UiSkeleton width="55%" />
        <UiSkeleton width="40%" height="48px" />
        <UiSkeleton class="skeleton-tile__foot" height="6px" radius="var(--radius-full)" />
      </div>
    </div>

    <UiSkeleton class="skeleton-nav" height="var(--control-md)" radius="var(--radius-full)" />

    <div v-for="section in 2" :key="section" class="tile skeleton-section" aria-hidden="true">
      <UiSkeleton width="40%" height="22px" />
      <UiSkeleton width="70%" />
      <UiSkeleton height="8px" radius="var(--radius-full)" />
      <UiSkeleton width="55%" />
      <UiSkeleton height="8px" radius="var(--radius-full)" />
    </div>
  </div>
</template>

<style scoped>
.skeleton-lead {
  display: grid;
  gap: var(--space-2);
  max-width: 34ch;
}

.skeleton-tile {
  gap: var(--space-3);
  min-height: 240px;
}

.skeleton-tile__foot {
  margin-top: auto;
}

/* The part navigation: full width on phones, a short pill on wide screens. */
.skeleton-nav {
  width: 100%;
}

@media (min-width: 641px) {
  .skeleton-nav {
    max-width: 420px;
  }
}

.skeleton-section {
  gap: var(--space-4);
}

@media (max-width: 900px) {
  .skeleton-tile {
    min-height: 180px;
  }
}
</style>

<script setup lang="ts">
/**
 * The shape of a report while it loads: the ink and lime
 * tiles, the part navigation and the first sections. The title sits in the
 * top bar like on the real report, when the chat is already known.
 */
defineProps<{ title?: string | null }>()
</script>

<template>
  <div class="stack stack--lg" aria-busy="true">
    <UiPageBar v-if="title" :title="title" back="/dashboard" />

    <div class="bento bento--split" aria-hidden="true">
      <div class="tile tile--ink span-8 skeleton-tile">
        <UiSkeleton width="30%" />
        <UiSkeleton width="45%" height="68px" />
        <UiSkeleton class="skeleton-tile__foot" height="56px" />
      </div>
      <div class="tile tile--lime span-4 skeleton-tile">
        <UiSkeleton width="55%" />
        <UiSkeleton width="40%" height="68px" />
        <UiSkeleton class="skeleton-tile__foot" height="var(--bar-height)" radius="var(--radius-full)" />
      </div>
    </div>

    <Teleport to="#header-sub" defer>
      <UiSkeleton class="skeleton-nav" height="var(--control-sm)" radius="var(--radius-full)" />
    </Teleport>

    <div v-for="section in 2" :key="section" class="tile skeleton-section" aria-hidden="true">
      <UiSkeleton width="40%" height="22px" />
      <UiSkeleton width="70%" />
      <UiSkeleton height="var(--bar-height)" radius="var(--radius-full)" />
      <UiSkeleton width="55%" />
      <UiSkeleton height="var(--bar-height)" radius="var(--radius-full)" />
    </div>
  </div>
</template>

<style scoped>
.skeleton-tile {
  gap: var(--space-3);
  min-height: var(--chart-h-sm);
}

.skeleton-tile.tile--ink {
  --skeleton: var(--on-tile-ink-well);
}

.skeleton-tile.tile--lime {
  --skeleton: var(--on-lime-well);
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
    max-width: var(--report-nav-width);
  }
}

.skeleton-section {
  gap: var(--space-4);
}

@media (max-width: 900px) {
  .skeleton-tile {
    min-height: calc(var(--chart-h-sm) - var(--space-10));
  }
}
</style>

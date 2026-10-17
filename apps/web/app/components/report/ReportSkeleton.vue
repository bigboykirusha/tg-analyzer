<template>
  <div class="stack stack--lg" aria-busy="true">
    <div class="skeleton-header">
      <UiSkeleton width="56px" height="56px" radius="50%" />
      <div class="stack skeleton-title">
        <UiSkeleton width="50%" height="28px" />
        <UiSkeleton width="30%" height="14px" />
      </div>
    </div>
    <UiSkeleton height="118px" radius="var(--radius-lg)" />
    <UiSkeleton height="46px" radius="var(--radius-full)" />
    <div class="skeleton-grid">
      <UiSkeleton v-for="item in 4" :key="item" height="280px" radius="var(--radius-lg)" />
    </div>
  </div>
</template>

<style scoped>
.skeleton-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.skeleton-title {
  flex: 1;
  gap: var(--space-2);
}

.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-5);
}

@media (max-width: 900px) {
  .skeleton-grid {
    grid-template-columns: 1fr;
  }
}
</style>

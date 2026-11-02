<script setup lang="ts">
/** The shape of `MonthSummary` while it loads: the podium of three and the next-chat tile, same rows, same heights. */
</script>

<template>
  <div class="bento" aria-hidden="true">
    <div class="tile tile--ink span-8 month-skeleton month-skeleton--ink">
      <UiSkeleton width="38%" />
      <div v-for="row in 3" :key="row" class="month-skeleton__row">
        <UiSkeleton width="24px" height="24px" radius="50%" />
        <UiSkeleton width="36px" height="36px" radius="50%" />
        <div class="month-skeleton__who">
          <UiSkeleton :width="`${64 - row * 10}%`" />
          <UiSkeleton height="4px" radius="var(--radius-full)" />
        </div>
        <UiSkeleton width="40px" />
      </div>
    </div>
    <div class="tile tile--lime span-4 month-skeleton month-skeleton--lime">
      <UiSkeleton width="55%" />
      <div class="month-skeleton__row month-skeleton__row--head">
        <UiSkeleton width="44px" height="44px" radius="50%" />
        <div class="month-skeleton__who">
          <UiSkeleton width="60%" height="20px" />
          <UiSkeleton width="85%" />
        </div>
      </div>
      <UiSkeleton height="var(--control-md)" radius="var(--radius-full)" />
    </div>
  </div>
</template>

<style scoped>
.month-skeleton {
  gap: var(--space-3);
}

.month-skeleton--ink {
  --skeleton: var(--on-tile-ink-well);
}

.month-skeleton--lime {
  --skeleton: var(--on-lime-well);
  justify-content: space-between;
}

.month-skeleton__row {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
}

.month-skeleton__row--head {
  grid-template-columns: auto minmax(0, 1fr);
}

.month-skeleton__who {
  display: grid;
  gap: 8px;
  min-width: 0;
}
</style>

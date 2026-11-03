<script setup lang="ts">
/** The shape of `MonthSummary` while it loads: the chart (leader and four rows) and the slim next-chat strip. */
</script>

<template>
  <div class="month-skeleton-wrap" aria-hidden="true">
    <div class="tile tile--ink month-skeleton month-skeleton--ink">
      <UiSkeleton width="30%" />
      <div class="month-skeleton__body">
        <div class="month-skeleton__row month-skeleton__row--lead">
          <UiSkeleton width="56px" height="56px" radius="50%" />
          <div class="month-skeleton__who">
            <UiSkeleton width="50%" height="20px" />
            <UiSkeleton width="40%" height="36px" />
            <UiSkeleton width="70%" />
          </div>
        </div>
        <div class="month-skeleton__rows">
          <div v-for="row in 4" :key="row" class="month-skeleton__row">
            <UiSkeleton width="28px" height="28px" radius="50%" />
            <UiSkeleton :width="`${70 - row * 8}%`" />
            <UiSkeleton width="40px" />
          </div>
        </div>
      </div>
    </div>
    <div class="tile tile--lime month-skeleton month-skeleton--lime">
      <UiSkeleton width="40px" height="40px" radius="50%" />
      <div class="month-skeleton__who">
        <UiSkeleton width="30%" />
        <UiSkeleton width="50%" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.month-skeleton-wrap {
  display: grid;
  gap: var(--card-gap);
}

.month-skeleton {
  gap: var(--space-4);
}

.month-skeleton--ink {
  --skeleton: var(--on-tile-ink-well);
}

.month-skeleton--lime {
  --skeleton: var(--on-lime-well);
  flex-direction: row;
  align-items: center;
  padding-block: var(--space-4);
}

.month-skeleton__body {
  display: grid;
  gap: var(--space-4);
}

@media (min-width: 901px) {
  .month-skeleton__body {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    gap: var(--space-8);
  }
}

.month-skeleton__rows {
  display: grid;
  gap: var(--space-3);
}

.month-skeleton__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
}

.month-skeleton__row--lead {
  grid-template-columns: auto minmax(0, 1fr);
}

.month-skeleton__who {
  display: grid;
  flex: 1;
  gap: 8px;
}
</style>

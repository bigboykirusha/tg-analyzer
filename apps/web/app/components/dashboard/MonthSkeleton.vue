<script setup lang="ts">
/** The shape of `MonthSummary` while it loads: the chart (leader and four rows) and the slim next-chat strip. */
</script>

<template>
  <div class="month-skeleton-wrap" aria-hidden="true">
    <div class="tile tile--ink month-skeleton month-skeleton--ink">
      <UiSkeleton width="30%" />
      <div class="month-skeleton__rows">
        <div
          v-for="row in 5"
          :key="row"
          class="month-skeleton__row"
          :class="{ 'month-skeleton__row--lead': row === 1 }"
        >
          <UiSkeleton width="12px" height="18px" />
          <UiSkeleton :width="row === 1 ? '44px' : '36px'" :height="row === 1 ? '44px' : '36px'" radius="50%" />
          <div class="month-skeleton__who">
            <UiSkeleton :width="`${75 - row * 7}%`" height="16px" />
            <UiSkeleton width="42%" height="10px" />
          </div>
          <UiSkeleton width="40px" height="16px" />
        </div>
      </div>
    </div>
    <div class="tile tile--lime month-skeleton month-skeleton--lime">
      <UiSkeleton width="40px" height="40px" radius="50%" />
      <div class="month-skeleton__who">
        <UiSkeleton width="30%" />
        <UiSkeleton width="50%" />
      </div>
      <UiSkeleton class="month-skeleton__action" height="var(--control-md)" />
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
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 104px;
  align-items: center;
  padding-block: var(--space-4);
}

.month-skeleton__rows {
  display: grid;
}

.month-skeleton__row {
  display: grid;
  grid-template-columns: 1.1em 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  padding-block: var(--space-2);
}

.month-skeleton__row--lead {
  padding-block: var(--space-3);
}

.month-skeleton__who {
  display: grid;
  min-width: 0;
  gap: var(--space-2);
}

@media (max-width: 520px) {
  .month-skeleton--lime {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .month-skeleton__action {
    grid-column: 1 / -1;
    width: 100%;
  }
}
</style>

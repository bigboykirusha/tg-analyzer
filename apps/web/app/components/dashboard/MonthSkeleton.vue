<script setup lang="ts">
/** The shape of «Главное» while the month loads: a leader row and four more, then a slim strip. */
</script>

<template>
  <div class="month-skeleton-wrap" aria-hidden="true">
    <div class="tile month-skeleton">
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
</style>

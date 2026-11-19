<script setup lang="ts">
defineProps<{ wideAside?: boolean }>()
</script>

<template>
  <div class="tile report-panel" :class="{ 'report-panel--wide-aside': wideAside }">
    <div class="report-panel__columns">
      <div class="report-panel__column"><slot /></div>
      <div v-if="$slots.aside" class="report-panel__column"><slot name="aside" /></div>
    </div>
    <div v-if="$slots.footer" class="report-panel__footer"><slot name="footer" /></div>
  </div>
</template>

<style scoped>
.report-panel {
  container: report-panel / inline-size;
  gap: 0;
}

.report-panel:not(:has(.report-section)),
.report-panel__columns:not(:has(.report-section)),
.report-panel__column:not(:has(.report-section)),
.report-panel__footer:not(:has(.report-section)) {
  display: none;
}

.report-panel__columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 0;
}

.report-panel__column,
.report-panel__footer {
  display: grid;
  align-content: start;
  min-width: 0;
}

.report-panel__column:has(.report-section) + .report-panel__column:has(.report-section),
.report-panel__columns:has(.report-section) + .report-panel__footer:has(.report-section) {
  margin-block-start: var(--space-5);
  padding-block-start: var(--space-5);
  box-shadow: var(--divider-top);
}

.report-panel__column > :deep(.report-section),
.report-panel__footer > :deep(.report-section) {
  padding: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.report-panel__column > :deep(.report-section ~ .report-section),
.report-panel__footer > :deep(.report-section ~ .report-section) {
  margin-block-start: var(--space-5);
  padding-block-start: var(--space-5);
  box-shadow: var(--divider-top);
}

@container report-panel (min-width: 36rem) {
  .report-panel__columns:has(> :first-child > .report-section):has(> :nth-child(2) > .report-section) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .report-panel--wide-aside
    .report-panel__columns:has(> :first-child > .report-section):has(> :nth-child(2) > .report-section) {
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
  }

  .report-panel__column:has(.report-section) + .report-panel__column:has(.report-section) {
    margin-block-start: 0;
    padding-block-start: 0;
    padding-inline-start: var(--space-6);
    box-shadow: var(--divider-left);
  }

  .report-panel__column:has(.report-section):has(+ .report-panel__column .report-section) {
    padding-inline-end: var(--space-6);
  }
}
</style>
